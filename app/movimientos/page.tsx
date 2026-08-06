import Form from "next/form";
import Link from "next/link";
import { eliminarMovimiento } from "@/app/actions";
import { BotonConfirmar } from "@/components/BotonConfirmar";
import { EtiquetaTipo, Tarjeta, Vacio } from "@/components/ui";
import { listarCategorias, listarMovimientos } from "@/lib/consultas";
import { fechaLarga, moneda, monedaConSigno } from "@/lib/formato";
import {
  esIngreso,
  ETIQUETAS_TIPO_MOVIMIENTO,
  esTipoMovimiento,
  TIPOS_MOVIMIENTO,
  type TipoMovimiento,
} from "@/lib/tipos";

export const dynamic = "force-dynamic";

type Busqueda = Record<string, string | string[] | undefined>;

function uno(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

/// "YYYY-MM-DD" -> Date en UTC. Devuelve null si no viene o no es válida.
function fechaDeTexto(texto: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const [anio, mes, dia] = texto.split("-").map(Number);
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function PaginaMovimientos({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}) {
  const params = await searchParams;
  const desdeTexto = uno(params.desde);
  const hastaTexto = uno(params.hasta);
  const tipoTexto = uno(params.tipo);
  const categoriaId = uno(params.categoria);
  const pagina = Math.max(Number(uno(params.pagina)) || 1, 1);

  const [listado, categorias] = await Promise.all([
    listarMovimientos({
      desde: fechaDeTexto(desdeTexto),
      hasta: fechaDeTexto(hastaTexto),
      tipos: esTipoMovimiento(tipoTexto) ? [tipoTexto] : null,
      categoriaId: categoriaId || null,
      pagina,
      porPagina: 25,
    }),
    listarCategorias(),
  ]);

  // Conserva los filtros al saltar de página.
  const enlacePagina = (n: number) => {
    const qs = new URLSearchParams();
    if (desdeTexto) qs.set("desde", desdeTexto);
    if (hastaTexto) qs.set("hasta", hastaTexto);
    if (tipoTexto) qs.set("tipo", tipoTexto);
    if (categoriaId) qs.set("categoria", categoriaId);
    if (n > 1) qs.set("pagina", String(n));
    const s = qs.toString();
    return s ? `/movimientos?${s}` : "/movimientos";
  };

  const hayFiltros = Boolean(desdeTexto || hastaTexto || tipoTexto || categoriaId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Movimientos</h1>
        <p className="mt-1 text-sm text-suave">
          {listado.total} {listado.total === 1 ? "registro" : "registros"}
          {hayFiltros ? " con los filtros aplicados" : ""}
        </p>
      </div>

      <Tarjeta titulo="Filtros">
        {/* GET: los filtros quedan en la URL y se pueden compartir o marcar. */}
        <Form action="/movimientos" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="etiqueta" htmlFor="desde">
              Desde
            </label>
            <input id="desde" name="desde" type="date" className="campo" defaultValue={desdeTexto} />
          </div>
          <div>
            <label className="etiqueta" htmlFor="hasta">
              Hasta
            </label>
            <input id="hasta" name="hasta" type="date" className="campo" defaultValue={hastaTexto} />
          </div>
          <div>
            <label className="etiqueta" htmlFor="tipo">
              Tipo
            </label>
            <select id="tipo" name="tipo" className="campo" defaultValue={tipoTexto}>
              <option value="">Todos</option>
              {TIPOS_MOVIMIENTO.map((t) => (
                <option key={t} value={t}>
                  {ETIQUETAS_TIPO_MOVIMIENTO[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="etiqueta" htmlFor="categoria">
              Categoría
            </label>
            <select id="categoria" name="categoria" className="campo" defaultValue={categoriaId}>
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-lg bg-acento px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Filtrar
            </button>
            {hayFiltros && (
              <Link
                href="/movimientos"
                className="rounded-lg border border-borde px-4 py-2 text-sm text-suave hover:text-texto"
              >
                Limpiar
              </Link>
            )}
          </div>
        </Form>
      </Tarjeta>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-borde bg-superficie p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-suave">Ingresos</p>
          <p className="cifra mt-1 text-lg font-semibold text-positivo">
            {moneda(listado.totalIngresos)}
          </p>
        </div>
        <div className="rounded-xl border border-borde bg-superficie p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-suave">Gastos</p>
          <p className="cifra mt-1 text-lg font-semibold text-negativo">
            {moneda(listado.totalGastos)}
          </p>
        </div>
        <div className="rounded-xl border border-borde bg-superficie p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-suave">Neto</p>
          <p
            className={`cifra mt-1 text-lg font-semibold ${
              listado.totalIngresos - listado.totalGastos >= 0 ? "text-positivo" : "text-negativo"
            }`}
          >
            {monedaConSigno(listado.totalIngresos - listado.totalGastos)}
          </p>
        </div>
      </div>

      <Tarjeta>
        {listado.items.length === 0 ? (
          <Vacio>No hay movimientos que cumplan estos filtros.</Vacio>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-borde text-left text-xs uppercase tracking-wide text-suave">
                  <th className="pb-2 pr-3 font-semibold">Fecha</th>
                  <th className="pb-2 pr-3 font-semibold">Tipo</th>
                  <th className="pb-2 pr-3 font-semibold">Motivo</th>
                  <th className="pb-2 pr-3 font-semibold">Categoría</th>
                  <th className="pb-2 pr-3 text-right font-semibold">Monto</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-borde">
                {listado.items.map((m) => {
                  const ingreso = esIngreso(m.tipo);
                  return (
                    <tr key={m.id}>
                      <td className="whitespace-nowrap py-2.5 pr-3 text-suave">
                        {fechaLarga(m.fecha)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <EtiquetaTipo
                          tipo={m.tipo}
                          texto={ETIQUETAS_TIPO_MOVIMIENTO[m.tipo as TipoMovimiento] ?? m.tipo}
                        />
                      </td>
                      <td className="max-w-xs truncate py-2.5 pr-3">{m.motivo ?? "—"}</td>
                      <td className="py-2.5 pr-3 text-suave">{m.categoriaNombre ?? "—"}</td>
                      <td
                        className={`cifra whitespace-nowrap py-2.5 pr-3 text-right font-medium ${
                          ingreso ? "text-positivo" : "text-negativo"
                        }`}
                      >
                        {monedaConSigno(ingreso ? m.monto : -m.monto)}
                      </td>
                      <td className="py-2.5 text-right">
                        <form action={eliminarMovimiento}>
                          <input type="hidden" name="id" value={m.id} />
                          <BotonConfirmar
                            confirmacion={`¿Eliminar "${m.motivo ?? "este movimiento"}"?`}
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

        {listado.totalPaginas > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-borde pt-4 text-sm">
            <span className="text-suave">
              Página {listado.pagina} de {listado.totalPaginas}
            </span>
            <div className="flex gap-2">
              {listado.pagina > 1 && (
                <Link
                  href={enlacePagina(listado.pagina - 1)}
                  className="rounded-lg border border-borde px-3 py-1.5 hover:border-acento"
                >
                  Anterior
                </Link>
              )}
              {listado.pagina < listado.totalPaginas && (
                <Link
                  href={enlacePagina(listado.pagina + 1)}
                  className="rounded-lg border border-borde px-3 py-1.5 hover:border-acento"
                >
                  Siguiente
                </Link>
              )}
            </div>
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
