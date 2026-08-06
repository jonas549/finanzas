"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ErrorValidacion, validarMovimiento } from "@/lib/movimientos";
import { validarRecurrente } from "@/lib/recurrentes";
import {
  esTipoMovimiento,
  esTipoRecurrente,
  TIPO_COBRO_FIJO,
  TIPO_PAGO_FIJO,
} from "@/lib/tipos";
import type { EstadoFormulario } from "@/lib/estado-formulario";

/// Las fechas del <input type="date"> vienen como "YYYY-MM-DD" sin huso.
/// Se anclan a mediodía UTC para que ningún desfase las corra de día.
function fechaDesdeInput(valor: FormDataEntryValue | null): Date {
  const texto = typeof valor === "string" ? valor.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    throw new ErrorValidacion("Falta la fecha.", "fecha");
  }
  const [anio, mes, dia] = texto.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia, 12));
}

function texto(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

function manejarError(e: unknown): EstadoFormulario {
  if (e instanceof ErrorValidacion) {
    return { ok: false, mensaje: e.message, campo: e.campo };
  }
  console.error(e);
  return { ok: false, mensaje: "No se pudo guardar. Revisa la consola del servidor." };
}

function revalidarTodo() {
  revalidatePath("/");
  revalidatePath("/movimientos");
  revalidatePath("/fijos");
  revalidatePath("/proyeccion");
  revalidatePath("/ajustes");
}

// ---------------------------------------------------------------------------
// Movimientos
// ---------------------------------------------------------------------------

export async function crearMovimiento(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  try {
    const tipo = texto(formData, "tipo");
    if (!esTipoMovimiento(tipo)) {
      throw new ErrorValidacion("Tipo de movimiento inválido.", "tipo");
    }

    const montoTexto = texto(formData, "monto").replace(",", ".");
    if (!montoTexto) throw new ErrorValidacion("Falta el monto.", "monto");
    if (!/^\d+(\.\d+)?$/.test(montoTexto)) {
      throw new ErrorValidacion("El monto debe ser un número positivo.", "monto");
    }

    const categoriaId = texto(formData, "categoriaId") || null;
    const recurrenteId = texto(formData, "recurrenteId") || null;

    // Un salario tiene que apuntar a un ingreso fijo que exista de verdad: es
    // ese vínculo el que lo saca de lo pendiente del mes. Si no se comprueba,
    // un id inventado lo dejaría contado dos veces.
    let fijo = null;
    if (recurrenteId) {
      fijo = await prisma.recurrente.findUnique({
        where: { id: recurrenteId },
        select: { nombre: true, tipo: true },
      });
      if (!fijo) {
        throw new ErrorValidacion("Ese ingreso fijo ya no existe.", "recurrenteId");
      }
      if (tipo === TIPO_COBRO_FIJO && fijo.tipo !== "INGRESO_FIJO") {
        throw new ErrorValidacion("Eso no es un ingreso fijo.", "recurrenteId");
      }
    }

    const datos = validarMovimiento({
      tipo,
      fecha: fechaDesdeInput(formData.get("fecha")),
      monto: montoTexto,
      // Sin motivo propio, el nombre del fijo dice más que un guion.
      motivo: texto(formData, "motivo") || fijo?.nombre || "",
      categoriaId,
      recurrenteId,
    });

    await prisma.movimiento.create({ data: datos });
    revalidarTodo();
    return { ok: true, mensaje: "Movimiento registrado." };
  } catch (e) {
    return manejarError(e);
  }
}

export async function eliminarMovimiento(formData: FormData): Promise<void> {
  const id = texto(formData, "id");
  if (!id) return;
  await prisma.movimiento.delete({ where: { id } });
  revalidarTodo();
}

// ---------------------------------------------------------------------------
// Fijos
// ---------------------------------------------------------------------------

export async function crearRecurrente(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  try {
    const tipo = texto(formData, "tipo");
    if (!esTipoRecurrente(tipo)) {
      throw new ErrorValidacion("Tipo inválido.", "tipo");
    }

    const montoTexto = texto(formData, "monto").replace(",", ".");
    if (!/^\d+(\.\d+)?$/.test(montoTexto)) {
      throw new ErrorValidacion("El monto debe ser un número positivo.", "monto");
    }

    const datos = validarRecurrente({
      tipo,
      nombre: texto(formData, "nombre"),
      monto: montoTexto,
      frecuenciaPorMes: Number(texto(formData, "frecuenciaPorMes") || "1"),
      diaEstimado: Number(texto(formData, "diaEstimado") || "0"),
      notas: texto(formData, "notas"),
      categoriaId: texto(formData, "categoriaId") || null,
    });

    await prisma.recurrente.create({ data: datos });
    revalidarTodo();
    return { ok: true, mensaje: `"${datos.nombre}" agregado.` };
  } catch (e) {
    return manejarError(e);
  }
}

/**
 * Registra una ocurrencia de un fijo: el salario que acabas de cobrar, o el
 * gasto fijo que acabas de pagar.
 *
 * El movimiento queda vinculado al fijo (`recurrenteId`), que es lo que hace
 * que deje de figurar como pendiente del mes en vez de sumarse dos veces —
 * una en el saldo real y otra como algo que todavía va a ocurrir.
 *
 * El monto es el teórico del fijo. Si cobraste distinto, el registro rápido del
 * dashboard permite ajustarlo antes de guardar.
 */
export async function marcarFijoOcurrido(formData: FormData): Promise<void> {
  const id = texto(formData, "id");
  if (!id) return;

  const fijo = await prisma.recurrente.findUnique({
    where: { id },
    select: { nombre: true, tipo: true, monto: true, categoriaId: true },
  });
  if (!fijo) return;

  const hoy = new Date();
  await prisma.movimiento.create({
    data: {
      tipo: fijo.tipo === "INGRESO_FIJO" ? TIPO_COBRO_FIJO : TIPO_PAGO_FIJO,
      // Mediodía UTC, igual que las fechas del formulario: así el movimiento
      // no se corre de día ni de mes por el huso horario.
      fecha: new Date(
        Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate(), 12),
      ),
      monto: fijo.monto,
      motivo: fijo.nombre,
      categoriaId: fijo.categoriaId,
      recurrenteId: id,
    },
  });

  revalidarTodo();
}

/// Borra la última ocurrencia registrada de un fijo en el mes en curso, para
/// deshacer un "marcar como cobrado" hecho por error sin ir a /movimientos.
export async function deshacerFijoOcurrido(formData: FormData): Promise<void> {
  const id = texto(formData, "id");
  if (!id) return;

  const hoy = new Date();
  const desde = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
  const hasta = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + 1, 1));

  const ultimo = await prisma.movimiento.findFirst({
    where: { recurrenteId: id, fecha: { gte: desde, lt: hasta } },
    orderBy: [{ fecha: "desc" }, { creadoEn: "desc" }],
    select: { id: true },
  });
  if (!ultimo) return;

  await prisma.movimiento.delete({ where: { id: ultimo.id } });
  revalidarTodo();
}

export async function alternarRecurrente(formData: FormData): Promise<void> {
  const id = texto(formData, "id");
  if (!id) return;
  const actual = await prisma.recurrente.findUnique({ where: { id }, select: { activo: true } });
  if (!actual) return;
  await prisma.recurrente.update({ where: { id }, data: { activo: !actual.activo } });
  revalidarTodo();
}

export async function eliminarRecurrente(formData: FormData): Promise<void> {
  const id = texto(formData, "id");
  if (!id) return;
  await prisma.recurrente.delete({ where: { id } });
  revalidarTodo();
}

// ---------------------------------------------------------------------------
// Meta de ahorro
// ---------------------------------------------------------------------------

export async function guardarMeta(formData: FormData): Promise<void> {
  const montoTexto = texto(formData, "meta").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(montoTexto)) return;
  // upsert y no update: la fila puede no existir todavía en una base virgen.
  await prisma.ajustes.upsert({
    where: { id: 1 },
    update: { metaAhorro: montoTexto },
    create: {
      id: 1,
      saldoInicial: "0",
      fechaCorte: new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)),
      metaAhorro: montoTexto,
    },
  });
  revalidarTodo();
}

// ---------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------

export async function guardarAjustes(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  try {
    const saldoTexto = texto(formData, "saldoInicial").replace(",", ".");
    if (!/^-?\d+(\.\d+)?$/.test(saldoTexto)) {
      throw new ErrorValidacion("El saldo base debe ser un número.", "saldoInicial");
    }

    const metaTexto = texto(formData, "metaAhorro").replace(",", ".");
    if (metaTexto && !/^\d+(\.\d+)?$/.test(metaTexto)) {
      throw new ErrorValidacion("La meta debe ser un número positivo.", "metaAhorro");
    }

    const datos = {
      saldoInicial: saldoTexto,
      fechaCorte: fechaDesdeInput(formData.get("fechaCorte")),
      metaAhorro: metaTexto || null,
    };

    await prisma.ajustes.upsert({
      where: { id: 1 },
      update: datos,
      create: { id: 1, ...datos },
    });

    revalidarTodo();
    return { ok: true, mensaje: "Ajustes guardados." };
  } catch (e) {
    return manejarError(e);
  }
}

// ---------------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------------

/// "" (sin ámbito) es válido: la categoría sirve para ingresos y gastos.
function ambitoDeForm(formData: FormData): string | null {
  const valor = texto(formData, "ambito");
  if (valor === "INGRESO" || valor === "GASTO") return valor;
  return null;
}

function esNombreDuplicado(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && e.code === "P2002";
}

export async function crearCategoria(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const nombre = texto(formData, "nombre");
  try {
    if (!nombre) throw new ErrorValidacion("El nombre es obligatorio.", "nombre");

    await prisma.categoria.create({
      data: {
        nombre,
        ambito: ambitoDeForm(formData),
        orden: Number(texto(formData, "orden")) || 0,
      },
    });

    revalidarTodo();
    return { ok: true, mensaje: `"${nombre}" creada.` };
  } catch (e) {
    if (esNombreDuplicado(e)) {
      return { ok: false, mensaje: `Ya existe una categoría llamada "${nombre}".`, campo: "nombre" };
    }
    return manejarError(e);
  }
}

export async function actualizarCategoria(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const nombre = texto(formData, "nombre");
  try {
    const id = texto(formData, "id");
    if (!id) throw new ErrorValidacion("Falta el identificador.", "id");
    if (!nombre) throw new ErrorValidacion("El nombre es obligatorio.", "nombre");

    await prisma.categoria.update({
      where: { id },
      data: {
        nombre,
        ambito: ambitoDeForm(formData),
        orden: Number(texto(formData, "orden")) || 0,
        activa: formData.get("activa") !== null,
      },
    });

    revalidarTodo();
    return { ok: true, mensaje: "Guardada." };
  } catch (e) {
    if (esNombreDuplicado(e)) {
      return { ok: false, mensaje: `Ya existe una categoría llamada "${nombre}".`, campo: "nombre" };
    }
    return manejarError(e);
  }
}

/// Los movimientos y fijos que la usaban quedan sin categoría (onDelete: SetNull),
/// no se borran.
export async function eliminarCategoria(formData: FormData): Promise<void> {
  const id = texto(formData, "id");
  if (!id) return;
  await prisma.categoria.delete({ where: { id } });
  revalidarTodo();
}
