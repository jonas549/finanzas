import Link from "next/link";
import { Barra, Cifra, EtiquetaTipo, Tarjeta, Vacio } from "@/components/ui";
import { FormularioMovimiento } from "@/components/FormularioMovimiento";
import {
  listarCategorias,
  listarMovimientos,
  listarRecurrentes,
  mesActual,
  resumenMes,
  saldoActual,
} from "@/lib/consultas";
import { fechaCorta, moneda, monedaConSigno, porcentaje } from "@/lib/formato";
import { esIngreso, ETIQUETAS_TIPO_MOVIMIENTO, type TipoMovimiento } from "@/lib/tipos";

// Lee la base en cada request: sin esto Next prerenderiza la página en el
// build y el saldo se queda congelado.
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const { anio, mes } = mesActual();
  const [saldo, resumen, categorias, recurrentes, ultimos] = await Promise.all([
    saldoActual(),
    resumenMes(anio, mes),
    listarCategorias(),
    listarRecurrentes(anio, mes),
    listarMovimientos({ porPagina: 8 }),
  ]);

  const ingresosFijos = recurrentes.filter((r) => r.tipo === "INGRESO_FIJO" && r.activo);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-suave capitalize">{resumen.etiqueta}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cifra
          rotulo="Saldo actual"
          valor={saldo}
          detalle={`Empezaste el mes con ${moneda(resumen.saldoInicio)}`}
        />
        <Cifra rotulo="Ingresos del mes" valor={resumen.ingresos} tono="positivo" />
        <Cifra rotulo="Gastos del mes" valor={resumen.gastos} tono="negativo" />
        <Cifra
          rotulo="Variación del mes"
          valor={resumen.neto}
          tono="auto"
          conSigno
          detalle={
            resumen.neto >= 0
              ? "Vas ahorrando este mes"
              : "Vas consumiendo ahorros este mes"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Tarjeta titulo="Registro rápido">
          <FormularioMovimiento categorias={categorias} ingresosFijos={ingresosFijos} />
        </Tarjeta>

        <Tarjeta titulo="Gastos por categoría">
          {resumen.gastosPorCategoria.length === 0 ? (
            <Vacio>Sin gastos este mes.</Vacio>
          ) : (
            <ul className="space-y-3">
              {resumen.gastosPorCategoria.map((linea) => (
                <li key={linea.categoriaId ?? "sin"} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">{linea.nombre}</span>
                    <span className="cifra shrink-0 tabular-nums">
                      {moneda(linea.total)}
                      <span className="ml-2 text-xs text-suave">
                        {porcentaje(linea.porcentaje)}
                      </span>
                    </span>
                  </div>
                  <Barra porcentaje={linea.porcentaje} tono="negativo" />
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <Tarjeta
        titulo="Últimos movimientos"
        accion={
          <Link href="/movimientos" className="text-xs text-acento hover:underline">
            Ver todos ({ultimos.total})
          </Link>
        }
      >
        {ultimos.items.length === 0 ? (
          <Vacio>Todavía no hay movimientos. Registra el primero arriba.</Vacio>
        ) : (
          <ul className="divide-y divide-borde">
            {ultimos.items.map((m) => {
              const ingreso = esIngreso(m.tipo);
              return (
                <li key={m.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <EtiquetaTipo
                        tipo={m.tipo}
                        texto={ETIQUETAS_TIPO_MOVIMIENTO[m.tipo as TipoMovimiento] ?? m.tipo}
                      />
                      <span className="truncate text-sm">{m.motivo ?? "—"}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-suave">
                      {fechaCorta(m.fecha)}
                      {m.categoriaNombre ? ` · ${m.categoriaNombre}` : ""}
                    </p>
                  </div>
                  <span
                    className={`cifra shrink-0 text-sm font-medium ${
                      ingreso ? "text-positivo" : "text-negativo"
                    }`}
                  >
                    {monedaConSigno(ingreso ? m.monto : -m.monto)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}
