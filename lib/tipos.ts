// Valores válidos de los campos discriminadores.
//
// SQLite no soporta `enum` en Prisma, así que en el schema son String. Estas
// constantes son la única fuente de verdad; al pasar a Postgres se pueden
// convertir en enums reales sin tocar el resto del código.
//
// Todo el sistema es en dólares: no hay tipo Moneda.

export const TIPOS_MOVIMIENTO = ["INGRESO_EXTRA", "GASTO_DIARIO", "VENTA"] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export const TIPOS_RECURRENTE = ["INGRESO_FIJO", "GASTO_FIJO"] as const;
export type TipoRecurrente = (typeof TIPOS_RECURRENTE)[number];

export const AMBITOS = ["INGRESO", "GASTO"] as const;
export type Ambito = (typeof AMBITOS)[number];

export const ETIQUETAS_TIPO_MOVIMIENTO: Record<TipoMovimiento, string> = {
  INGRESO_EXTRA: "Ingreso extra",
  GASTO_DIARIO: "Gasto diario",
  VENTA: "Venta",
};

export const ETIQUETAS_TIPO_RECURRENTE: Record<TipoRecurrente, string> = {
  INGRESO_FIJO: "Ingreso fijo",
  GASTO_FIJO: "Gasto fijo",
};

/// Los únicos movimientos que suman. El resto resta.
export function esIngreso(tipo: string): boolean {
  return tipo === "INGRESO_EXTRA";
}

/// El ámbito de categoría que corresponde a un tipo de movimiento.
export function ambitoDe(tipo: TipoMovimiento): Ambito {
  return esIngreso(tipo) ? "INGRESO" : "GASTO";
}

export function esTipoMovimiento(v: unknown): v is TipoMovimiento {
  return TIPOS_MOVIMIENTO.includes(v as TipoMovimiento);
}

export function esTipoRecurrente(v: unknown): v is TipoRecurrente {
  return TIPOS_RECURRENTE.includes(v as TipoRecurrente);
}
