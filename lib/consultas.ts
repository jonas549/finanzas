// Capa de consultas: todo lo que la UI necesita leer.
//
// Dos reglas de esta capa:
//
//  1. La aritmética se hace con Decimal, nunca con `number`.
//  2. Lo que sale de aquí es serializable (números y strings planos), porque
//     cruza la frontera Server -> Client Component y un Decimal no sobrevive.
//
// Las fechas se manejan en UTC de punta a punta para que el mes al que cae un
// movimiento no dependa del huso horario de quien mire la pantalla.

import { Prisma } from "./generated/prisma/client";
import { prisma } from "./prisma";
import { esIngreso, type TipoMovimiento } from "./tipos";
import { impactoMensual } from "./recurrentes";

const { Decimal } = Prisma;

const CERO = new Decimal(0);
const centavos = (d: Prisma.Decimal) => d.toDecimalPlaces(2).toNumber();

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

export function inicioDeMes(anio: number, mes: number): Date {
  return new Date(Date.UTC(anio, mes, 1));
}

/// Exclusivo: el primer instante del mes siguiente.
export function finDeMes(anio: number, mes: number): Date {
  return new Date(Date.UTC(anio, mes + 1, 1));
}

export function mesActual(): { anio: number; mes: number } {
  const hoy = new Date();
  return { anio: hoy.getUTCFullYear(), mes: hoy.getUTCMonth() };
}

const NOMBRES_MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function etiquetaMes(anio: number, mes: number): string {
  // Normaliza desbordes (mes 12 -> enero del año siguiente).
  const d = new Date(Date.UTC(anio, mes, 1));
  return `${NOMBRES_MES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ---------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------

export async function obtenerAjustes() {
  const ajustes = await prisma.ajustes.findUnique({ where: { id: 1 } });
  if (!ajustes) {
    throw new Error("No hay Ajustes configurados. Corre `npm run db:seed`.");
  }
  return ajustes;
}

// ---------------------------------------------------------------------------
// Saldo
// ---------------------------------------------------------------------------

/// Suma firmada de los movimientos en un rango: ingresos suman, el resto resta.
async function netoEntre(desde: Date, hasta?: Date): Promise<Prisma.Decimal> {
  const grupos = await prisma.movimiento.groupBy({
    by: ["tipo"],
    _sum: { monto: true },
    where: { fecha: { gte: desde, ...(hasta ? { lt: hasta } : {}) } },
  });

  return grupos.reduce((acc, g) => {
    const total = g._sum.monto ?? CERO;
    return esIngreso(g.tipo) ? acc.plus(total) : acc.minus(total);
  }, CERO);
}

export async function saldoActual(): Promise<number> {
  const ajustes = await obtenerAjustes();
  const neto = await netoEntre(ajustes.fechaCorte);
  return centavos(ajustes.saldoInicial.plus(neto));
}

// ---------------------------------------------------------------------------
// Resumen mensual (cierre del mes)
// ---------------------------------------------------------------------------

export type LineaCategoria = {
  categoriaId: string | null;
  nombre: string;
  total: number;
  /// Porcentaje sobre el total de su grupo (0-100).
  porcentaje: number;
};

export type ResumenMes = {
  anio: number;
  mes: number;
  etiqueta: string;
  saldoInicio: number;
  saldoFin: number;
  ingresos: number;
  gastos: number;
  /// ingresos - gastos. Positivo = ahorraste, negativo = consumiste ahorros.
  neto: number;
  cantidadMovimientos: number;
  gastosPorCategoria: LineaCategoria[];
  ingresosPorCategoria: LineaCategoria[];
};

export async function resumenMes(anio: number, mes: number): Promise<ResumenMes> {
  const ajustes = await obtenerAjustes();
  const desde = inicioDeMes(anio, mes);
  const hasta = finDeMes(anio, mes);

  // Saldo con el que se empezó el mes: todo lo anterior, acumulado.
  const netoPrevio = await netoEntre(ajustes.fechaCorte, desde);
  const saldoInicio = ajustes.saldoInicial.plus(netoPrevio);

  const [grupos, porCategoria, categorias, cantidadMovimientos] = await Promise.all([
    prisma.movimiento.groupBy({
      by: ["tipo"],
      _sum: { monto: true },
      where: { fecha: { gte: desde, lt: hasta } },
    }),
    prisma.movimiento.groupBy({
      by: ["categoriaId", "tipo"],
      _sum: { monto: true },
      where: { fecha: { gte: desde, lt: hasta } },
    }),
    prisma.categoria.findMany({ select: { id: true, nombre: true } }),
    prisma.movimiento.count({ where: { fecha: { gte: desde, lt: hasta } } }),
  ]);

  let ingresos = CERO;
  let gastos = CERO;
  for (const g of grupos) {
    const total = g._sum.monto ?? CERO;
    if (esIngreso(g.tipo)) ingresos = ingresos.plus(total);
    else gastos = gastos.plus(total);
  }

  const nombrePorId = new Map(categorias.map((c) => [c.id, c.nombre]));

  // Varios tipos pueden caer en la misma categoría (p.ej. gasto diario y venta),
  // así que se acumulan antes de calcular porcentajes.
  const acumular = (soloIngresos: boolean, granTotal: Prisma.Decimal): LineaCategoria[] => {
    const porId = new Map<string | null, Prisma.Decimal>();
    for (const fila of porCategoria) {
      if (esIngreso(fila.tipo) !== soloIngresos) continue;
      const previo = porId.get(fila.categoriaId) ?? CERO;
      porId.set(fila.categoriaId, previo.plus(fila._sum.monto ?? CERO));
    }
    return [...porId.entries()]
      .map(([categoriaId, total]) => ({
        categoriaId,
        nombre: categoriaId ? (nombrePorId.get(categoriaId) ?? "(eliminada)") : "Sin categoría",
        total: centavos(total),
        porcentaje: granTotal.isZero() ? 0 : centavos(total.div(granTotal).mul(100)),
      }))
      .sort((a, b) => b.total - a.total);
  };

  return {
    anio,
    mes,
    etiqueta: etiquetaMes(anio, mes),
    saldoInicio: centavos(saldoInicio),
    saldoFin: centavos(saldoInicio.plus(ingresos).minus(gastos)),
    ingresos: centavos(ingresos),
    gastos: centavos(gastos),
    neto: centavos(ingresos.minus(gastos)),
    cantidadMovimientos,
    gastosPorCategoria: acumular(false, gastos),
    ingresosPorCategoria: acumular(true, ingresos),
  };
}

// ---------------------------------------------------------------------------
// Listado de movimientos
// ---------------------------------------------------------------------------

export type FiltrosMovimientos = {
  desde?: Date | null;
  hasta?: Date | null;
  tipos?: TipoMovimiento[] | null;
  categoriaId?: string | null;
  pagina?: number;
  porPagina?: number;
};

export type MovimientoListado = {
  id: string;
  tipo: string;
  fecha: string;
  monto: number;
  motivo: string | null;
  categoriaId: string | null;
  categoriaNombre: string | null;
};

export type ListadoMovimientos = {
  items: MovimientoListado[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
  /// Totales del conjunto filtrado completo, no sólo de la página visible.
  totalIngresos: number;
  totalGastos: number;
};

export async function listarMovimientos(
  filtros: FiltrosMovimientos = {},
): Promise<ListadoMovimientos> {
  const porPagina = Math.min(Math.max(filtros.porPagina ?? 25, 1), 200);
  const pagina = Math.max(filtros.pagina ?? 1, 1);

  const where: Prisma.MovimientoWhereInput = {};
  if (filtros.desde || filtros.hasta) {
    where.fecha = {
      ...(filtros.desde ? { gte: filtros.desde } : {}),
      // `hasta` es inclusivo para el usuario: se toma todo ese día.
      ...(filtros.hasta ? { lt: new Date(filtros.hasta.getTime() + 86_400_000) } : {}),
    };
  }
  if (filtros.tipos?.length) where.tipo = { in: filtros.tipos };
  if (filtros.categoriaId) where.categoriaId = filtros.categoriaId;

  const [total, filas, grupos] = await Promise.all([
    prisma.movimiento.count({ where }),
    prisma.movimiento.findMany({
      where,
      orderBy: [{ fecha: "desc" }, { creadoEn: "desc" }],
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      include: { categoria: { select: { nombre: true } } },
    }),
    prisma.movimiento.groupBy({ by: ["tipo"], _sum: { monto: true }, where }),
  ]);

  let totalIngresos = CERO;
  let totalGastos = CERO;
  for (const g of grupos) {
    const t = g._sum.monto ?? CERO;
    if (esIngreso(g.tipo)) totalIngresos = totalIngresos.plus(t);
    else totalGastos = totalGastos.plus(t);
  }

  return {
    items: filas.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      fecha: m.fecha.toISOString(),
      monto: centavos(m.monto),
      motivo: m.motivo,
      categoriaId: m.categoriaId,
      categoriaNombre: m.categoria?.nombre ?? null,
    })),
    total,
    pagina,
    porPagina,
    totalPaginas: Math.max(Math.ceil(total / porPagina), 1),
    totalIngresos: centavos(totalIngresos),
    totalGastos: centavos(totalGastos),
  };
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export type CategoriaListada = {
  id: string;
  nombre: string;
  ambito: string | null;
};

export async function listarCategorias(): Promise<CategoriaListada[]> {
  return prisma.categoria.findMany({
    where: { activa: true },
    orderBy: [{ ambito: "asc" }, { orden: "asc" }],
    select: { id: true, nombre: true, ambito: true },
  });
}

// ---------------------------------------------------------------------------
// Fijos y proyección
// ---------------------------------------------------------------------------

export type RecurrenteListado = {
  id: string;
  tipo: string;
  nombre: string;
  monto: number;
  frecuenciaPorMes: number;
  diaEstimado: number;
  activo: boolean;
  notas: string | null;
  categoriaNombre: string | null;
  /// monto * frecuenciaPorMes, sin signo.
  totalMensual: number;
};

export async function listarRecurrentes(): Promise<RecurrenteListado[]> {
  const filas = await prisma.recurrente.findMany({
    orderBy: [{ tipo: "asc" }, { diaEstimado: "asc" }],
    include: { categoria: { select: { nombre: true } } },
  });

  return filas.map((r) => ({
    id: r.id,
    tipo: r.tipo,
    nombre: r.nombre,
    monto: centavos(r.monto),
    frecuenciaPorMes: r.frecuenciaPorMes,
    diaEstimado: r.diaEstimado,
    activo: r.activo,
    notas: r.notas,
    categoriaNombre: r.categoria?.nombre ?? null,
    totalMensual: centavos(r.monto.mul(r.frecuenciaPorMes)),
  }));
}

export type ResumenFijos = {
  ingresos: number;
  gastos: number;
  /// ingresos - gastos: lo que el mes deja (o consume) si nada cambia.
  neto: number;
};

export async function resumenFijos(): Promise<ResumenFijos> {
  const activos = await prisma.recurrente.findMany({
    where: { activo: true },
    select: { tipo: true, monto: true, frecuenciaPorMes: true },
  });

  let ingresos = CERO;
  let gastos = CERO;
  for (const r of activos) {
    const impacto = impactoMensual(r);
    if (impacto.isPositive()) ingresos = ingresos.plus(impacto);
    else gastos = gastos.plus(impacto.abs());
  }

  return {
    ingresos: centavos(ingresos),
    gastos: centavos(gastos),
    neto: centavos(ingresos.minus(gastos)),
  };
}

export type FilaProyeccion = {
  anio: number;
  mes: number;
  etiqueta: string;
  ingresos: number;
  gastos: number;
  neto: number;
  saldoFin: number;
};

/**
 * Proyecta el saldo mes a mes asumiendo que sólo ocurren los fijos activos.
 * La fila 1 es el próximo mes completo; el mes en curso no se re-proyecta
 * porque su saldo ya está reflejado en `saldoActual`.
 */
export async function proyeccion(meses: number): Promise<{
  saldoActual: number;
  fijos: ResumenFijos;
  filas: FilaProyeccion[];
}> {
  const cantidad = Math.min(Math.max(Math.trunc(meses), 1), 120);
  const [saldo, fijos] = await Promise.all([saldoActual(), resumenFijos()]);

  const neto = new Decimal(fijos.neto);
  const { anio, mes } = mesActual();

  let acumulado = new Decimal(saldo);
  const filas: FilaProyeccion[] = [];
  for (let i = 1; i <= cantidad; i++) {
    acumulado = acumulado.plus(neto);
    const d = new Date(Date.UTC(anio, mes + i, 1));
    filas.push({
      anio: d.getUTCFullYear(),
      mes: d.getUTCMonth(),
      etiqueta: etiquetaMes(d.getUTCFullYear(), d.getUTCMonth()),
      ingresos: fijos.ingresos,
      gastos: fijos.gastos,
      neto: fijos.neto,
      saldoFin: centavos(acumulado),
    });
  }

  return { saldoActual: saldo, fijos, filas };
}

export type ResultadoMeta = {
  meta: number;
  saldoActual: number;
  faltante: number;
  netoMensual: number;
  /// null si la meta ya está alcanzada o si es inalcanzable.
  meses: number | null;
  alcanzada: boolean;
  /// true si el neto mensual no permite llegar nunca.
  inalcanzable: boolean;
  /// ISO del primer día del mes en que se alcanzaría.
  fechaEstimada: string | null;
};

export async function mesesParaMeta(monto: number | string): Promise<ResultadoMeta> {
  const meta = new Decimal(monto);
  const [saldo, fijos] = await Promise.all([saldoActual(), resumenFijos()]);

  const saldoDec = new Decimal(saldo);
  const neto = new Decimal(fijos.neto);
  const faltante = meta.minus(saldoDec);

  const base = {
    meta: centavos(meta),
    saldoActual: saldo,
    faltante: centavos(faltante),
    netoMensual: fijos.neto,
  };

  if (faltante.lte(0)) {
    return { ...base, meses: 0, alcanzada: true, inalcanzable: false, fechaEstimada: null };
  }

  // Sin excedente mensual el saldo no crece: la meta no llega nunca.
  if (neto.lte(0)) {
    return { ...base, meses: null, alcanzada: false, inalcanzable: true, fechaEstimada: null };
  }

  const meses = Math.ceil(faltante.div(neto).toNumber());
  const { anio, mes } = mesActual();
  const fecha = new Date(Date.UTC(anio, mes + meses, 1));

  return {
    ...base,
    meses,
    alcanzada: false,
    inalcanzable: false,
    fechaEstimada: fecha.toISOString(),
  };
}
