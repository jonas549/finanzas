import {
  alternarRecurrente,
  deshacerFijoOcurrido,
  eliminarRecurrente,
  marcarFijoOcurrido,
} from "@/app/actions";
import { BotonConfirmar } from "@/components/BotonConfirmar";
import { FormularioRecurrente } from "@/components/FormularioRecurrente";
import { Cifra, EtiquetaTipo, Tarjeta, Vacio } from "@/components/ui";
import {
  etiquetaMes,
  listarCategorias,
  listarRecurrentes,
  mesActual,
  pendienteDelMes,
  resumenFijos,
  saldoActual,
} from "@/lib/consultas";
import { moneda } from "@/lib/formato";
import { ETIQUETAS_TIPO_RECURRENTE, type TipoRecurrente } from "@/lib/tipos";

export const dynamic = "force-dynamic";

export default async function PaginaFijos() {
  const { anio, mes } = mesActual();
  const [fijos, pendiente, saldo, recurrentes, categorias] = await Promise.all([
    resumenFijos(),
    pendienteDelMes(anio, mes),
    saldoActual(),
    listarRecurrentes(anio, mes),
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cifra rotulo="Ingresos fijos" valor={fijos.ingresos} tono="positivo" detalle="Al mes" />
        <Cifra rotulo="Gastos fijos" valor={fijos.gastos} tono="negativo" detalle="Al mes" />
        <Cifra
          rotulo="Neto mensual"
          valor={fijos.neto}
          tono="auto"
          conSigno
          detalle={fijos.neto >= 0 ? "Lo que deja cada mes" : "Déficit cada mes"}
        />
        {/* Lo cobrado ya está dentro del saldo, así que sólo se suma lo que
            todavía falta: sumar el fijo completo lo contaría dos veces. */}
        <Cifra
          rotulo="Cierre estimado"
          valor={saldo + pendiente.neto}
          tono="auto"
          detalle={`Falta cobrar ${moneda(pendiente.ingresos)} y pagar ${moneda(
            pendiente.gastos,
          )} en ${etiquetaMes(anio, mes)}`}
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
                    <th className="pb-2 pr-3 font-semibold">Este mes</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-borde">
                  {grupo.filas.map((r) => {
                    const esIngresoFijo = r.tipo === "INGRESO_FIJO";
                    const verbo = esIngresoFijo ? "cobrado" : "pagado";
                    const parcial = r.vecesEsteMes > 0 && !r.completoEsteMes;

                    return (
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

                      <td className="whitespace-nowrap py-2.5 pr-3">
                        {!r.activo ? (
                          <span className="text-xs text-suave">—</span>
                        ) : r.completoEsteMes ? (
                          <div className="flex items-center gap-2">
                            <EtiquetaTipo
                              tipo={r.tipo}
                              texto={`${verbo.charAt(0).toUpperCase()}${verbo.slice(1)} · ${moneda(
                                r.totalEsteMes,
                              )}`}
                            />
                            <form action={deshacerFijoOcurrido} className="inline">
                              <input type="hidden" name="id" value={r.id} />
                              <BotonConfirmar
                                confirmacion={`¿Deshacer el último ${verbo} de "${r.nombre}" de este mes?`}
                                className="text-xs text-suave hover:text-negativo"
                              >
                                Deshacer
                              </BotonConfirmar>
                            </form>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <form action={marcarFijoOcurrido} className="inline">
                              <input type="hidden" name="id" value={r.id} />
                              <button
                                type="submit"
                                className="rounded-lg border border-acento px-2.5 py-1 text-xs font-medium text-acento transition-colors hover:bg-acento/10"
                                title={`Registra ${moneda(r.monto)} con fecha de hoy y lo descuenta de lo pendiente del mes`}
                              >
                                Marcar como {verbo}
                              </button>
                            </form>
                            {parcial && (
                              <span className="text-xs text-suave">
                                {r.vecesEsteMes} de {r.frecuenciaPorMes}
                              </span>
                            )}
                          </div>
                        )}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      ))}

      <div className="space-y-1 text-xs text-suave">
        <p>
          {ETIQUETAS_TIPO_RECURRENTE["INGRESO_FIJO" as TipoRecurrente]} y{" "}
          {ETIQUETAS_TIPO_RECURRENTE["GASTO_FIJO" as TipoRecurrente]} pausados no se cuentan en la
          proyección, pero se conservan.
        </p>
        <p>
          Marcar como cobrado crea el movimiento con fecha de hoy y suma al saldo al instante. Ese
          fijo deja de contarse como pendiente en {etiquetaMes(anio, mes)}, así que no se suma dos
          veces. Si cobraste un monto distinto, regístralo desde el dashboard con el tipo Salario.
        </p>
      </div>
    </div>
  );
}
