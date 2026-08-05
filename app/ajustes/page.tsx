import { FormularioAjustes } from "@/components/FormularioAjustes";
import { SeccionCategorias } from "@/components/SeccionCategorias";
import { Tarjeta } from "@/components/ui";
import { listarTodasCategorias, obtenerAjustes, saldoActual } from "@/lib/consultas";
import { moneda } from "@/lib/formato";

export const dynamic = "force-dynamic";

export default async function PaginaAjustes() {
  const [ajustes, categorias, saldo] = await Promise.all([
    obtenerAjustes(),
    listarTodasCategorias(),
    saldoActual(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Ajustes</h1>
        <p className="mt-1 text-sm text-suave">
          Saldo actual: <span className="cifra">{moneda(saldo)}</span>
        </p>
      </div>

      <Tarjeta titulo="Punto de partida">
        {!ajustes.persistido && (
          <p className="mb-4 rounded-lg border border-borde bg-fondo p-3 text-xs text-suave">
            Todavía no hay ajustes guardados. Los valores de abajo son los que se usarán por
            defecto hasta que guardes.
          </p>
        )}
        <FormularioAjustes
          saldoInicial={ajustes.saldoInicial.toString()}
          fechaCorte={ajustes.fechaCorte.toISOString().slice(0, 10)}
          metaAhorro={ajustes.metaAhorro?.toString() ?? ""}
        />
      </Tarjeta>

      <Tarjeta titulo="Categorías">
        <SeccionCategorias categorias={categorias} />
      </Tarjeta>
    </div>
  );
}
