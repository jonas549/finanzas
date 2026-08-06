"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { crearMovimiento } from "@/app/actions";
import { ESTADO_INICIAL } from "@/lib/estado-formulario";
import { fechaInput, moneda } from "@/lib/formato";
import {
  ambitoDe,
  ETIQUETAS_TIPO_MOVIMIENTO,
  TIPO_COBRO_FIJO,
  TIPOS_MOVIMIENTO,
  type TipoMovimiento,
} from "@/lib/tipos";
import type { CategoriaListada, RecurrenteListado } from "@/lib/consultas";

/// Lo que el selector de salario necesita saber de cada ingreso fijo.
export type IngresoFijoParaCobro = Pick<
  RecurrenteListado,
  "id" | "nombre" | "monto" | "categoriaId" | "frecuenciaPorMes" | "vecesEsteMes" | "completoEsteMes"
>;

/// Cómo va ese fijo en el mes en curso, dicho en la propia opción del selector
/// para no depender de estado extra sólo para un texto de ayuda.
function estadoDelMes(f: IngresoFijoParaCobro): string {
  if (f.completoEsteMes) return " · ya cobrado este mes";
  if (f.vecesEsteMes > 0) return ` · van ${f.vecesEsteMes} de ${f.frecuenciaPorMes} este mes`;
  return "";
}

export function FormularioMovimiento({
  categorias,
  ingresosFijos,
}: {
  categorias: CategoriaListada[];
  ingresosFijos: IngresoFijoParaCobro[];
}) {
  const [estado, accion, pendiente] = useActionState(crearMovimiento, ESTADO_INICIAL);
  const [tipo, setTipo] = useState<TipoMovimiento>("GASTO_DIARIO");

  const formulario = useRef<HTMLFormElement>(null);
  const montoRef = useRef<HTMLInputElement>(null);
  const categoriaRef = useRef<HTMLSelectElement>(null);

  // Tras guardar, se limpia todo menos el tipo: registrar varios gastos
  // seguidos es el caso normal. Los campos son no controlados justamente para
  // que esto alcance — reset() los devuelve a su defaultValue.
  useEffect(() => {
    if (estado.ok) formulario.current?.reset();
  }, [estado]);

  const esSalario = tipo === TIPO_COBRO_FIJO;

  // Sólo tienen sentido las categorías del ámbito del tipo elegido.
  const ambito = ambitoDe(tipo);
  const visibles = categorias.filter((c) => c.ambito === null || c.ambito === ambito);

  // Elegir el fijo precarga monto y categoría escribiendo en el DOM: son
  // valores de arranque, no un vínculo permanente. Quedan editables por si
  // este mes cobraste distinto.
  const elegirFijo = (id: string) => {
    const fijo = ingresosFijos.find((f) => f.id === id);
    if (!fijo) return;
    if (montoRef.current) montoRef.current.value = String(fijo.monto);
    if (categoriaRef.current) categoriaRef.current.value = fijo.categoriaId ?? "";
  };

  const motivoObligatorio = tipo === "VENTA";
  const errorEn = (campo: string) => (!estado.ok && estado.campo === campo ? estado.mensaje : null);

  return (
    <form ref={formulario} action={accion} className="space-y-4">
      <div>
        <span className="etiqueta">Tipo</span>
        <div className="flex flex-wrap gap-2">
          {TIPOS_MOVIMIENTO.map((t) => (
            <label
              key={t}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                tipo === t
                  ? "border-acento bg-acento/10 text-acento"
                  : "border-borde text-suave hover:text-texto"
              }`}
            >
              <input
                type="radio"
                name="tipo"
                value={t}
                checked={tipo === t}
                onChange={() => setTipo(t)}
                className="sr-only"
              />
              {ETIQUETAS_TIPO_MOVIMIENTO[t]}
            </label>
          ))}
        </div>
      </div>

      {/* El selector sólo se monta en Salario: así no viaja `recurrenteId`
          en los otros tipos y no queda un vínculo colgando. */}
      {esSalario &&
        (ingresosFijos.length === 0 ? (
          <p className="rounded-lg border border-borde bg-fondo p-3 text-xs text-suave">
            No tienes ingresos fijos cargados todavía. Agrégalos en{" "}
            <Link href="/fijos" className="text-acento hover:underline">
              Fijos
            </Link>{" "}
            y aparecerán aquí para cobrarlos.
          </p>
        ) : (
          <div>
            <label className="etiqueta" htmlFor="recurrenteId">
              ¿Cuál ingreso fijo?
            </label>
            <select
              id="recurrenteId"
              name="recurrenteId"
              className="campo"
              defaultValue=""
              onChange={(e) => elegirFijo(e.target.value)}
              required
            >
              <option value="">Elige uno…</option>
              {ingresosFijos.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nombre} — {moneda(f.monto)}
                  {estadoDelMes(f)}
                </option>
              ))}
            </select>
            {errorEn("recurrenteId") && (
              <p className="mt-1 text-xs text-negativo">{errorEn("recurrenteId")}</p>
            )}
            <p className="mt-1 text-xs text-suave">
              El monto y la categoría se precargan; cámbialos si este mes cobraste distinto.
            </p>
          </div>
        ))}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiqueta" htmlFor="monto">
            Monto (USD)
          </label>
          <input
            id="monto"
            name="monto"
            ref={montoRef}
            className="campo cifra"
            inputMode="decimal"
            placeholder="0,00"
            autoComplete="off"
            required
          />
          {errorEn("monto") && <p className="mt-1 text-xs text-negativo">{errorEn("monto")}</p>}
        </div>

        <div>
          <label className="etiqueta" htmlFor="fecha">
            Fecha
          </label>
          <input
            id="fecha"
            name="fecha"
            type="date"
            className="campo"
            defaultValue={fechaInput()}
            required
          />
          {errorEn("fecha") && <p className="mt-1 text-xs text-negativo">{errorEn("fecha")}</p>}
        </div>
      </div>

      <div>
        <label className="etiqueta" htmlFor="categoriaId">
          Categoría
        </label>
        <select
          id="categoriaId"
          name="categoriaId"
          ref={categoriaRef}
          className="campo"
          defaultValue=""
        >
          <option value="">Sin categoría</option>
          {visibles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        {visibles.length === 0 && (
          <p className="mt-1 text-xs text-suave">
            No hay categorías para {ambito === "INGRESO" ? "ingresos" : "gastos"} todavía. Puedes
            registrar igual y crearlas en{" "}
            <Link href="/ajustes" className="text-acento hover:underline">
              Ajustes
            </Link>
            .
          </p>
        )}
      </div>

      <div>
        <label className="etiqueta" htmlFor="motivo">
          Motivo {motivoObligatorio ? "(obligatorio)" : "(opcional)"}
        </label>
        <input
          id="motivo"
          name="motivo"
          className="campo"
          placeholder={
            motivoObligatorio
              ? "¿Qué vendiste y por qué?"
              : esSalario
                ? "Se usa el nombre del ingreso fijo"
                : "En qué se fue"
          }
          autoComplete="off"
          required={motivoObligatorio}
        />
        {errorEn("motivo") && <p className="mt-1 text-xs text-negativo">{errorEn("motivo")}</p>}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-lg bg-acento px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pendiente ? "Guardando…" : "Registrar"}
        </button>
        {estado.mensaje && !estado.campo && (
          <p className={`text-sm ${estado.ok ? "text-positivo" : "text-negativo"}`}>
            {estado.mensaje}
          </p>
        )}
      </div>
    </form>
  );
}
