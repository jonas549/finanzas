"use client";

import { useActionState, useEffect, useRef } from "react";
import { actualizarCategoria, crearCategoria, eliminarCategoria } from "@/app/actions";
import { BotonConfirmar } from "@/components/BotonConfirmar";
import { ESTADO_INICIAL } from "@/lib/estado-formulario";
import type { CategoriaAdministrable } from "@/lib/consultas";

const OPCIONES_AMBITO = [
  { valor: "", texto: "Ingresos y gastos" },
  { valor: "INGRESO", texto: "Sólo ingresos" },
  { valor: "GASTO", texto: "Sólo gastos" },
];

function SelectorAmbito({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <select name={nombre} className="campo" defaultValue={valor}>
      {OPCIONES_AMBITO.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.texto}
        </option>
      ))}
    </select>
  );
}

/// Cada fila lleva su propio estado de acción para que un error de una no
/// pise el mensaje de las demás. El botón de eliminar va en un form aparte:
/// anidar formularios no es HTML válido.
function FilaCategoria({ categoria }: { categoria: CategoriaAdministrable }) {
  const [estado, accion, pendiente] = useActionState(actualizarCategoria, ESTADO_INICIAL);

  const advertencia =
    categoria.usos > 0
      ? `"${categoria.nombre}" está en uso por ${categoria.usos} ${
          categoria.usos === 1 ? "registro" : "registros"
        }. Si la eliminas, esos registros quedan sin categoría (no se borran). ¿Continuar?`
      : `¿Eliminar "${categoria.nombre}"?`;

  return (
    <li className="border-t border-borde py-3 first:border-t-0">
      <div className="flex flex-wrap items-start gap-2">
        <form action={accion} className="flex grow flex-wrap items-start gap-2">
          <input type="hidden" name="id" value={categoria.id} />

          <div className="min-w-[10rem] grow">
            <input
              name="nombre"
              className="campo"
              defaultValue={categoria.nombre}
              aria-label="Nombre"
              required
            />
          </div>

          <div className="w-44">
            <SelectorAmbito nombre="ambito" valor={categoria.ambito ?? ""} />
          </div>

          <div className="w-20">
            <input
              name="orden"
              type="number"
              className="campo cifra"
              defaultValue={categoria.orden}
              aria-label="Orden"
            />
          </div>

          <label className="flex h-9 items-center gap-2 whitespace-nowrap text-sm text-suave">
            <input type="checkbox" name="activa" defaultChecked={categoria.activa} />
            Activa
          </label>

          <button
            type="submit"
            disabled={pendiente}
            className="h-9 rounded-lg border border-borde px-3 text-sm hover:border-acento disabled:opacity-50"
          >
            {pendiente ? "…" : "Guardar"}
          </button>
        </form>

        <form action={eliminarCategoria}>
          <input type="hidden" name="id" value={categoria.id} />
          <BotonConfirmar
            confirmacion={advertencia}
            className="h-9 rounded-lg px-3 text-sm text-suave hover:text-negativo"
          >
            Eliminar
          </BotonConfirmar>
        </form>
      </div>

      <div className="mt-1 flex flex-wrap gap-x-3 text-xs">
        {categoria.usos > 0 && (
          <span className="text-suave">
            {categoria.usos} {categoria.usos === 1 ? "registro" : "registros"}
          </span>
        )}
        {estado.mensaje && (
          <span className={estado.ok ? "text-positivo" : "text-negativo"}>{estado.mensaje}</span>
        )}
      </div>
    </li>
  );
}

export function SeccionCategorias({ categorias }: { categorias: CategoriaAdministrable[] }) {
  const [estado, accion, pendiente] = useActionState(crearCategoria, ESTADO_INICIAL);
  const formulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formulario.current?.reset();
  }, [estado]);

  return (
    <div className="space-y-5">
      <form ref={formulario} action={accion} className="flex flex-wrap items-start gap-2">
        <div className="min-w-[10rem] grow">
          <label className="etiqueta" htmlFor="cat-nombre">
            Nueva categoría
          </label>
          <input
            id="cat-nombre"
            name="nombre"
            className="campo"
            placeholder="Alimentación, sueldo…"
            autoComplete="off"
            required
          />
        </div>

        <div className="w-44">
          <label className="etiqueta" htmlFor="cat-ambito">
            Aplica a
          </label>
          <SelectorAmbito nombre="ambito" valor="" />
        </div>

        <div className="w-20">
          <label className="etiqueta" htmlFor="cat-orden">
            Orden
          </label>
          <input
            id="cat-orden"
            name="orden"
            type="number"
            className="campo cifra"
            defaultValue={0}
          />
        </div>

        <button
          type="submit"
          disabled={pendiente}
          className="mt-[1.4rem] h-9 rounded-lg bg-acento px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pendiente ? "…" : "Crear"}
        </button>
      </form>

      {estado.mensaje && (
        <p className={`text-sm ${estado.ok ? "text-positivo" : "text-negativo"}`}>
          {estado.mensaje}
        </p>
      )}

      {categorias.length === 0 ? (
        <p className="rounded-lg border border-dashed border-borde py-8 text-center text-sm text-suave">
          No hay categorías todavía. Crea las que uses de verdad — puedes agregar más
          después.
        </p>
      ) : (
        <ul>
          {categorias.map((c) => (
            <FilaCategoria key={c.id} categoria={c} />
          ))}
        </ul>
      )}
    </div>
  );
}
