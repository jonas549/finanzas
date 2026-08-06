import Form from "next/form";
import { guardarMeta } from "@/app/actions";
import { Cifra, Tarjeta } from "@/components/ui";
import { mesesParaMeta, obtenerAjustes, proyeccion } from "@/lib/consultas";
import { fechaLarga, moneda, monedaConSigno } from "@/lib/formato";

export const dynamic = "force-dynamic";

type Busqueda = Record<string, string | string[] | undefined>;

function uno(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function PaginaProyeccion({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}) {
  const params = await searchParams;
  const ajustes = await obtenerAjustes();

  const meses = Math.min(Math.max(Number(uno(params.meses)) || 12, 1), 120);
  const metaTexto = uno(params.meta).replace(",", ".");
  const metaPredeterminada = ajustes.metaAhorro ? ajustes.metaAhorro.toNumber() : null;
  const meta = /^\d+(\.\d+)?$/.test(metaTexto) ? Number(metaTexto) : metaPredeterminada;

  const [datos, resultadoMeta] = await Promise.all([
    proyeccion(meses),
    meta !== null ? mesesParaMeta(meta) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Proyección</h1>
        <p className="mt-1 text-sm text-suave">
          Asume que sólo ocurren los fijos activos. Los gastos sueltos no entran. Del mes en curso
          se cuenta sólo lo que falta: lo ya cobrado o pagado vive en el saldo actual.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cifra rotulo="Saldo actual" valor={datos.saldoActual} />
        <Cifra
          rotulo="Cierre de este mes"
          valor={datos.saldoCierreMes}
          tono="auto"
          detalle={`Falta cobrar ${moneda(datos.pendiente.ingresos)} y pagar ${moneda(
            datos.pendiente.gastos,
          )}`}
        />
        <Cifra
          rotulo="Neto mensual"
          valor={datos.fijos.neto}
          tono="auto"
          conSigno
          detalle={`${moneda(datos.fijos.ingresos)} − ${moneda(datos.fijos.gastos)}`}
        />
        <Cifra
          rotulo={`Saldo en ${meses} ${meses === 1 ? "mes" : "meses"}`}
          valor={datos.filas.at(-1)?.saldoFin ?? datos.saldoActual}
          tono="auto"
        />
      </div>

      <Tarjeta titulo="Parámetros">
        <Form action="/proyeccion" className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="etiqueta" htmlFor="meses">
              Meses a proyectar
            </label>
            <input
              id="meses"
              name="meses"
              type="number"
              min={1}
              max={120}
              className="campo cifra"
              defaultValue={meses}
            />
          </div>
          <div>
            <label className="etiqueta" htmlFor="meta">
              Meta de ahorro (USD)
            </label>
            <input
              id="meta"
              name="meta"
              className="campo cifra"
              inputMode="decimal"
              placeholder="10000"
              defaultValue={meta ?? ""}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-lg bg-acento px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Calcular
            </button>
          </div>
        </Form>
      </Tarjeta>

      {resultadoMeta && (
        <Tarjeta
          titulo="Meta"
          accion={
            metaPredeterminada !== resultadoMeta.meta ? (
              <form action={guardarMeta}>
                <input type="hidden" name="meta" value={resultadoMeta.meta} />
                <button type="submit" className="text-xs text-acento hover:underline">
                  Guardar como meta por defecto
                </button>
              </form>
            ) : null
          }
        >
          {resultadoMeta.alcanzada ? (
            <p className="text-sm">
              <span className="font-medium text-positivo">Meta alcanzada.</span> Ya tienes{" "}
              <span className="cifra">{moneda(resultadoMeta.saldoActual)}</span> contra una meta de{" "}
              <span className="cifra">{moneda(resultadoMeta.meta)}</span>.
            </p>
          ) : resultadoMeta.inalcanzable ? (
            <p className="text-sm">
              <span className="font-medium text-negativo">No se alcanza.</span> Con un neto mensual
              de <span className="cifra">{monedaConSigno(resultadoMeta.netoMensual)}</span> el saldo
              no crece. Te faltan{" "}
              <span className="cifra">{moneda(resultadoMeta.faltante)}</span> y harían falta más
              ingresos fijos o menos gastos fijos.
            </p>
          ) : (
            <div className="space-y-2 text-sm">
              <p>
                Te faltan <span className="cifra">{moneda(resultadoMeta.faltante)}</span> para llegar
                a <span className="cifra">{moneda(resultadoMeta.meta)}</span>.
              </p>
              <p className="text-lg font-semibold">
                {resultadoMeta.meses} {resultadoMeta.meses === 1 ? "mes" : "meses"}
                {resultadoMeta.fechaEstimada && (
                  <span className="ml-2 text-sm font-normal text-suave">
                    (aprox. {fechaLarga(resultadoMeta.fechaEstimada)})
                  </span>
                )}
              </p>
            </div>
          )}
        </Tarjeta>
      )}

      <Tarjeta titulo="Mes a mes">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-borde text-left text-xs uppercase tracking-wide text-suave">
                <th className="pb-2 pr-3 font-semibold">Mes</th>
                <th className="pb-2 pr-3 text-right font-semibold">Ingresos</th>
                <th className="pb-2 pr-3 text-right font-semibold">Gastos</th>
                <th className="pb-2 pr-3 text-right font-semibold">Neto</th>
                <th className="pb-2 text-right font-semibold">Saldo al cierre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              <tr className="text-suave">
                <td className="py-2.5 pr-3">Hoy</td>
                <td className="py-2.5 pr-3 text-right">—</td>
                <td className="py-2.5 pr-3 text-right">—</td>
                <td className="py-2.5 pr-3 text-right">—</td>
                <td className="cifra py-2.5 text-right font-medium text-texto">
                  {moneda(datos.saldoActual)}
                </td>
              </tr>
              {datos.filas.map((f) => (
                <tr key={`${f.anio}-${f.mes}`}>
                  <td className="py-2.5 pr-3 capitalize">
                    {f.etiqueta}
                    {/* El mes en curso muestra lo que le queda por ocurrir, no
                        el fijo completo: lo ya cobrado está en el saldo. */}
                    {f.enCurso && (
                      <span className="ml-2 text-xs normal-case text-suave">
                        lo que falta del mes
                      </span>
                    )}
                  </td>
                  <td className="cifra py-2.5 pr-3 text-right text-positivo">
                    {moneda(f.ingresos)}
                  </td>
                  <td className="cifra py-2.5 pr-3 text-right text-negativo">{moneda(f.gastos)}</td>
                  <td
                    className={`cifra py-2.5 pr-3 text-right ${
                      f.neto >= 0 ? "text-positivo" : "text-negativo"
                    }`}
                  >
                    {monedaConSigno(f.neto)}
                  </td>
                  <td className="cifra py-2.5 text-right font-medium">{moneda(f.saldoFin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </div>
  );
}
