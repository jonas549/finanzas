"use client";

import { useActionState, useEffect, useRef } from "react";
import { crearRecurrente } from "@/app/actions";
import { ESTADO_INICIAL } from "@/lib/estado-formulario";
import { ETIQUETAS_TIPO_RECURRENTE, TIPOS_RECURRENTE } from "@/lib/tipos";
import type { CategoriaListada } from "@/lib/consultas";

export function FormularioRecurrente({ categorias }: { categorias: CategoriaListada[] }) {
  const [estado, accion, pendiente] = useActionState(crearRecurrente, ESTADO_INICIAL);
  const formulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formulario.current?.reset();
  }, [estado]);

  const errorEn = (campo: string) => (!estado.ok && estado.campo === campo ? estado.mensaje : null);

  return (
    <form ref={formulario} action={accion} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiqueta" htmlFor="r-tipo">
            Tipo
          </label>
          <select id="r-tipo" name="tipo" className="campo" defaultValue="GASTO_FIJO">
            {TIPOS_RECURRENTE.map((t) => (
              <option key={t} value={t}>
                {ETIQUETAS_TIPO_RECURRENTE[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="etiqueta" htmlFor="r-nombre">
            Nombre
          </label>
          <input
            id="r-nombre"
            name="nombre"
            className="campo"
            placeholder="Alquiler, sueldo…"
            autoComplete="off"
            required
          />
          {errorEn("nombre") && <p className="mt-1 text-xs text-negativo">{errorEn("nombre")}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="etiqueta" htmlFor="r-monto">
            Monto por vez
          </label>
          <input
            id="r-monto"
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
          <label className="etiqueta" htmlFor="r-frecuencia">
            Veces al mes
          </label>
          <input
            id="r-frecuencia"
            name="frecuenciaPorMes"
            type="number"
            min={1}
            max={31}
            className="campo cifra"
            defaultValue={1}
            required
          />
          {errorEn("frecuenciaPorMes") && (
            <p className="mt-1 text-xs text-negativo">{errorEn("frecuenciaPorMes")}</p>
          )}
        </div>

        <div>
          <label className="etiqueta" htmlFor="r-dia">
            Día estimado
          </label>
          <input
            id="r-dia"
            name="diaEstimado"
            type="number"
            min={1}
            max={31}
            className="campo cifra"
            defaultValue={1}
            required
          />
          {errorEn("diaEstimado") && (
            <p className="mt-1 text-xs text-negativo">{errorEn("diaEstimado")}</p>
          )}
        </div>
      </div>

      <div>
        <label className="etiqueta" htmlFor="r-categoria">
          Categoría
        </label>
        <select id="r-categoria" name="categoriaId" className="campo" defaultValue="">
          <option value="">Sin categoría</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-lg bg-acento px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pendiente ? "Guardando…" : "Agregar"}
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
