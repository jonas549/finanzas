"use client";

import { useActionState } from "react";
import { guardarAjustes } from "@/app/actions";
import { ESTADO_INICIAL } from "@/lib/estado-formulario";

export function FormularioAjustes({
  saldoInicial,
  fechaCorte,
  metaAhorro,
}: {
  saldoInicial: string;
  /// "YYYY-MM-DD"
  fechaCorte: string;
  metaAhorro: string;
}) {
  const [estado, accion, pendiente] = useActionState(guardarAjustes, ESTADO_INICIAL);
  const errorEn = (campo: string) => (!estado.ok && estado.campo === campo ? estado.mensaje : null);

  return (
    <form action={accion} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="etiqueta" htmlFor="saldoInicial">
            Saldo base (USD)
          </label>
          <input
            id="saldoInicial"
            name="saldoInicial"
            className="campo cifra"
            inputMode="decimal"
            defaultValue={saldoInicial}
            autoComplete="off"
            required
          />
          {errorEn("saldoInicial") && (
            <p className="mt-1 text-xs text-negativo">{errorEn("saldoInicial")}</p>
          )}
          <p className="mt-1 text-xs text-suave">
            Los ahorros con los que arranca todo. El saldo actual es este número más lo que registres.
          </p>
        </div>

        <div>
          <label className="etiqueta" htmlFor="fechaCorte">
            Fecha de corte
          </label>
          <input
            id="fechaCorte"
            name="fechaCorte"
            type="date"
            className="campo"
            defaultValue={fechaCorte}
            required
          />
          {errorEn("fechaCorte") && (
            <p className="mt-1 text-xs text-negativo">{errorEn("fechaCorte")}</p>
          )}
          <p className="mt-1 text-xs text-suave">
            Los movimientos con fecha anterior a este día no cuentan para el saldo.
          </p>
        </div>

        <div>
          <label className="etiqueta" htmlFor="metaAhorro">
            Meta de ahorro (opcional)
          </label>
          <input
            id="metaAhorro"
            name="metaAhorro"
            className="campo cifra"
            inputMode="decimal"
            placeholder="Sin meta"
            defaultValue={metaAhorro}
            autoComplete="off"
          />
          {errorEn("metaAhorro") && (
            <p className="mt-1 text-xs text-negativo">{errorEn("metaAhorro")}</p>
          )}
          <p className="mt-1 text-xs text-suave">Se usa por defecto en la proyección.</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-lg bg-acento px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pendiente ? "Guardando…" : "Guardar ajustes"}
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
