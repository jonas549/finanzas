import { alternarRecurrente, eliminarRecurrente } from "@/app/actions";
import { BotonConfirmar } from "@/components/BotonConfirmar";
import { FormularioRecurrente } from "@/components/FormularioRecurrente";
import { Cifra, EtiquetaTipo, Tarjeta, Vacio } from "@/components/ui";
import { listarCategorias, listarRecurrentes, resumenFijos } from "@/lib/consultas";
import { moneda } from "@/lib/formato";
import { ETIQUETAS_TIPO_RECURRENTE, type TipoRecurrente } from "@/lib/tipos";

export const dynamic = "force-dynamic";

export default async function PaginaFijos() {
  const [fijos, recurrentes, categorias] = await Promise.all([
    resumenFijos(),
    listarRecurrentes(),
    listarCategorias(),
  ]);

  const ingresos = recurrentes.filter((r) => r.tipo === "INGRESO_FIJO");
  const gastos = recurrentes.filter((r) => r.tipo === "GASTO_FIJO");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Ingresos y gastos fijos</h1>
        <p className="mt-1 text-sm text-suave">
          Lo que se repite cada mes. Es la base de la proyección.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Cifra rotulo="Ingresos fijos" valor={fijos.ingresos} tono="positivo" detalle="Al mes" />
        <Cifra rotulo="Gastos fijos" valor={fijos.gastos} tono="negativo" detalle="Al mes" />
        <Cifra
          rotulo="Neto mensual"
          valor={fijos.neto}
          tono="auto"
          conSigno
          detalle={fijos.neto >= 0 ? "Lo que deja cada mes" : "Déficit cada mes"}
        />
      </div>

      <Tarjeta titulo="Agregar fijo">
        <FormularioRecurrente categorias={categorias} />
      </Tarjeta>

      {[
        { titulo: "Ingresos fijos", filas: ingresos },
        { titulo: "Gastos fijos", filas: gastos },
      ].map((grupo) => (
        <Tarjeta key={grupo.titulo} titulo={grupo.titulo}>
          {grupo.filas.length === 0 ? (
            <Vacio>Nada registrado todavía.</Vacio>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-borde text-left text-xs uppercase tracking-wide text-suave">
                    <th className="pb-2 pr-3 font-semibold">Nombre</th>
                    <th className="pb-2 pr-3 font-semibold">Categoría</th>
                    <th className="pb-2 pr-3 text-right font-semibold">Por vez</th>
                    <th className="pb-2 pr-3 text-right font-semibold">Veces</th>
                    <th className="pb-2 pr-3 text-right font-semibold">Día</th>
                    <th className="pb-2 pr-3 text-right font-semibold">Al mes</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-borde">
                  {grupo.filas.map((r) => (
                    <tr key={r.id} className={r.activo ? "" : "opacity-45"}>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <span>{r.nombre}</span>
                          {!r.activo && <EtiquetaTipo tipo="—" texto="pausado" />}
                        </div>
                        {r.notas && <p className="text-xs text-suave">{r.notas}</p>}
                      </td>
                      <td className="py-2.5 pr-3 text-suave">{r.categoriaNombre ?? "—"}</td>
                      <td className="cifra py-2.5 pr-3 text-right">{moneda(r.monto)}</td>
                      <td className="cifra py-2.5 pr-3 text-right text-suave">
                        {r.frecuenciaPorMes}
                      </td>
                      <td className="cifra py-2.5 pr-3 text-right text-suave">{r.diaEstimado}</td>
                      <td
                        className={`cifra py-2.5 pr-3 text-right font-medium ${
                          r.tipo === "INGRESO_FIJO" ? "text-positivo" : "text-negativo"
                        }`}
                      >
                        {moneda(r.totalMensual)}
                      </td>
                      <td className="whitespace-nowrap py-2.5 text-right">
                        <form action={alternarRecurrente} className="inline">
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="text-xs text-suave hover:text-acento"
                            title={
                              r.activo
                                ? "Dejar de contarlo en la proyección"
                                : "Volver a contarlo en la proyección"
                            }
                          >
                            {r.activo ? "Pausar" : "Activar"}
                          </button>
                        </form>
                        <form action={eliminarRecurrente} className="ml-3 inline">
                          <input type="hidden" name="id" value={r.id} />
                          <BotonConfirmar
                            confirmacion={`¿Eliminar "${r.nombre}"?`}
                            className="text-xs text-suave hover:text-negativo"
                          >
                            Eliminar
                          </BotonConfirmar>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      ))}

      <p className="text-xs text-suave">
        {ETIQUETAS_TIPO_RECURRENTE["INGRESO_FIJO" as TipoRecurrente]} y{" "}
        {ETIQUETAS_TIPO_RECURRENTE["GASTO_FIJO" as TipoRecurrente]} pausados no se cuentan en la
        proyección, pero se conservan.
      </p>
    </div>
  );
}
