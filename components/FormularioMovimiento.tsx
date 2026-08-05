"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { crearMovimiento } from "@/app/actions";
import { ESTADO_INICIAL } from "@/lib/estado-formulario";
import { fechaInput } from "@/lib/formato";
import { ambitoDe, ETIQUETAS_TIPO_MOVIMIENTO, TIPOS_MOVIMIENTO, type TipoMovimiento } from "@/lib/tipos";
import type { CategoriaListada } from "@/lib/consultas";

export function FormularioMovimiento({ categorias }: { categorias: CategoriaListada[] }) {
  const [estado, accion, pendiente] = useActionState(crearMovimiento, ESTADO_INICIAL);
  const [tipo, setTipo] = useState<TipoMovimiento>("GASTO_DIARIO");
  const formulario = useRef<HTMLFormElement>(null);

  // Tras guardar, se limpia todo menos el tipo: registrar varios gastos
  // seguidos es el caso normal.
  useEffect(() => {
    if (estado.ok) formulario.current?.reset();
  }, [estado]);

  // Sólo tienen sentido las categorías del ámbito del tipo elegido.
  const ambito = ambitoDe(tipo);
  const visibles = categorias.filter((c) => c.ambito === null || c.ambito === ambito);

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiqueta" htmlFor="monto">
            Monto (USD)
          </label>
          <input
            id="monto"
            name="monto"
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
        <select id="categoriaId" name="categoriaId" className="campo" defaultValue="">
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
          placeholder={motivoObligatorio ? "¿Qué vendiste y por qué?" : "En qué se fue"}
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
