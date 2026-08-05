// Formateo para la UI. Locale fijo en ambos lados (servidor y cliente) para
// que el HTML del servidor y el de la hidratación coincidan.

const LOCALE = "es-VE";

const NUMERO = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/// "$1.234,56" — con signo negativo delante del símbolo si aplica.
export function moneda(n: number): string {
  const signo = n < 0 ? "-" : "";
  return `${signo}$${NUMERO.format(Math.abs(n))}`;
}

/// Igual que `moneda` pero fuerza el signo, para variaciones.
export function monedaConSigno(n: number): string {
  if (n === 0) return moneda(0);
  return `${n > 0 ? "+" : "-"}$${NUMERO.format(Math.abs(n))}`;
}

export function porcentaje(n: number): string {
  return `${NUMERO.format(n)}%`;
}

const FECHA_CORTA = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

const FECHA_LARGA = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function fechaCorta(iso: string | Date): string {
  return FECHA_CORTA.format(new Date(iso));
}

export function fechaLarga(iso: string | Date): string {
  return FECHA_LARGA.format(new Date(iso));
}

/// "YYYY-MM-DD" en UTC, para prellenar <input type="date">.
export function fechaInput(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}
