// Validación de Movimiento.
//
// Todo es en dólares. `monto` se guarda siempre positivo y el signo lo aporta
// `tipo` al momento de agregar (ver lib/consultas.ts), así que no hay campos
// derivados que persistir ni que puedan desincronizarse.
//
// La aritmética usa Decimal, no `number`, para no arrastrar errores de coma
// flotante en los montos.

import { Prisma } from "./generated/prisma/client";
import type { TipoMovimiento } from "./tipos";

const { Decimal } = Prisma;
export type NumeroEntrada = Prisma.Decimal | number | string;

export type EntradaMovimiento = {
  tipo: TipoMovimiento;
  fecha: Date;
  /// Siempre positivo.
  monto: NumeroEntrada;
  motivo?: string | null;
  categoriaId?: string | null;
  /// El fijo que originó este movimiento, si lo hay.
  recurrenteId?: string | null;
};

export type MovimientoValidado = {
  tipo: TipoMovimiento;
  fecha: Date;
  monto: Prisma.Decimal;
  motivo: string | null;
  categoriaId: string | null;
  recurrenteId: string | null;
};

export class ErrorValidacion extends Error {
  constructor(
    message: string,
    readonly campo: string,
  ) {
    super(message);
    this.name = "ErrorValidacion";
  }
}

/**
 * Valida una entrada y la normaliza para guardar.
 * Lanza ErrorValidacion si algo no cuadra.
 */
export function validarMovimiento(entrada: EntradaMovimiento): MovimientoValidado {
  const monto = new Decimal(entrada.monto);
  if (!monto.isFinite() || monto.lte(0)) {
    throw new ErrorValidacion("El monto debe ser mayor que cero.", "monto");
  }

  if (!(entrada.fecha instanceof Date) || Number.isNaN(entrada.fecha.getTime())) {
    throw new ErrorValidacion("La fecha no es válida.", "fecha");
  }

  const motivo = entrada.motivo?.trim() || null;
  if (entrada.tipo === "VENTA" && !motivo) {
    throw new ErrorValidacion("El motivo es obligatorio en una venta.", "motivo");
  }

  const recurrenteId = entrada.recurrenteId?.trim() || null;
  // Sin el vínculo, un salario sería indistinguible de un ingreso extra y el
  // fijo seguiría contándose como pendiente: es dinero contado dos veces.
  if (entrada.tipo === "SALARIO" && !recurrenteId) {
    throw new ErrorValidacion("Elige de cuál ingreso fijo es este salario.", "recurrenteId");
  }

  return {
    tipo: entrada.tipo,
    fecha: entrada.fecha,
    monto: monto.toDecimalPlaces(2),
    motivo,
    categoriaId: entrada.categoriaId ?? null,
    recurrenteId,
  };
}
