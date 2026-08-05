// Validación de Recurrente (ingresos y gastos fijos). Todo en dólares.

import { Prisma } from "./generated/prisma/client";
import { ErrorValidacion, type NumeroEntrada } from "./movimientos";
import type { TipoRecurrente } from "./tipos";

const { Decimal } = Prisma;

export type EntradaRecurrente = {
  tipo: TipoRecurrente;
  nombre: string;
  /// Monto de UNA ocurrencia. Siempre positivo.
  monto: NumeroEntrada;
  /// Ocurrencias al mes: mensual = 1, quincenal = 2, semanal = 4.
  frecuenciaPorMes?: number;
  /// Día del mes de la primera ocurrencia (1-31).
  diaEstimado: number;
  activo?: boolean;
  notas?: string | null;
  categoriaId?: string | null;
};

export type RecurrenteValidado = {
  tipo: TipoRecurrente;
  nombre: string;
  monto: Prisma.Decimal;
  frecuenciaPorMes: number;
  diaEstimado: number;
  activo: boolean;
  notas: string | null;
  categoriaId: string | null;
};

export function validarRecurrente(entrada: EntradaRecurrente): RecurrenteValidado {
  const nombre = entrada.nombre.trim();
  if (!nombre) {
    throw new ErrorValidacion("El nombre es obligatorio.", "nombre");
  }

  const monto = new Decimal(entrada.monto);
  if (!monto.isFinite() || monto.lte(0)) {
    throw new ErrorValidacion("El monto debe ser mayor que cero.", "monto");
  }

  const frecuenciaPorMes = entrada.frecuenciaPorMes ?? 1;
  if (!Number.isInteger(frecuenciaPorMes) || frecuenciaPorMes < 1 || frecuenciaPorMes > 31) {
    throw new ErrorValidacion(
      "La frecuencia debe ser un entero de ocurrencias al mes (1 = mensual).",
      "frecuenciaPorMes",
    );
  }

  if (!Number.isInteger(entrada.diaEstimado) || entrada.diaEstimado < 1 || entrada.diaEstimado > 31) {
    throw new ErrorValidacion("El día estimado debe estar entre 1 y 31.", "diaEstimado");
  }

  return {
    tipo: entrada.tipo,
    nombre,
    monto: monto.toDecimalPlaces(2),
    frecuenciaPorMes,
    diaEstimado: entrada.diaEstimado,
    activo: entrada.activo ?? true,
    notas: entrada.notas?.trim() || null,
    categoriaId: entrada.categoriaId ?? null,
  };
}

/// Impacto mensual firmado: positivo para ingresos fijos, negativo para gastos.
export function impactoMensual(r: {
  tipo: string;
  monto: NumeroEntrada;
  frecuenciaPorMes: number;
}): Prisma.Decimal {
  const total = new Decimal(r.monto).mul(r.frecuenciaPorMes);
  return r.tipo === "INGRESO_FIJO" ? total : total.neg();
}
