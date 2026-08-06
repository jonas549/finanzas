import { moneda, monedaConSigno } from "@/lib/formato";

export function Tarjeta({
  titulo,
  accion,
  children,
  className = "",
}: {
  titulo?: string;
  accion?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-borde bg-superficie p-5 ${className}`}>
      {(titulo || accion) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {titulo && <h2 className="text-sm font-semibold">{titulo}</h2>}
          {accion}
        </div>
      )}
      {children}
    </section>
  );
}

/// Cifra grande con rótulo. `tono` colorea según el signo del valor.
export function Cifra({
  rotulo,
  valor,
  tono = "neutro",
  conSigno = false,
  detalle,
}: {
  rotulo: string;
  valor: number;
  tono?: "neutro" | "positivo" | "negativo" | "auto";
  conSigno?: boolean;
  detalle?: string;
}) {
  const resuelto = tono === "auto" ? (valor >= 0 ? "positivo" : "negativo") : tono;
  const color =
    resuelto === "positivo"
      ? "text-positivo"
      : resuelto === "negativo"
        ? "text-negativo"
        : "text-texto";

  return (
    <div className="rounded-xl border border-borde bg-superficie p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-suave">{rotulo}</p>
      <p className={`cifra mt-2 text-2xl font-semibold ${color}`}>
        {conSigno ? monedaConSigno(valor) : moneda(valor)}
      </p>
      {detalle && <p className="mt-1 text-xs text-suave">{detalle}</p>}
    </div>
  );
}

const ESTILOS_ETIQUETA: Record<string, string> = {
  SALARIO: "bg-positivo-fondo text-positivo",
  INGRESO_EXTRA: "bg-positivo-fondo text-positivo",
  GASTO_DIARIO: "bg-negativo-fondo text-negativo",
  VENTA: "bg-negativo-fondo text-negativo",
  INGRESO_FIJO: "bg-positivo-fondo text-positivo",
  GASTO_FIJO: "bg-negativo-fondo text-negativo",
};

export function EtiquetaTipo({ tipo, texto }: { tipo: string; texto: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        ESTILOS_ETIQUETA[tipo] ?? "bg-fondo text-suave"
      }`}
    >
      {texto}
    </span>
  );
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-suave">{children}</p>;
}

/// Barra proporcional para el desglose por categoría.
export function Barra({ porcentaje, tono }: { porcentaje: number; tono: "positivo" | "negativo" }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-fondo">
      <div
        className={`h-full rounded-full ${tono === "positivo" ? "bg-positivo" : "bg-negativo"}`}
        style={{ width: `${Math.min(Math.max(porcentaje, 0), 100)}%` }}
      />
    </div>
  );
}
