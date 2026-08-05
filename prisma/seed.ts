// Seed mínimo: sólo el punto de partida del sistema.
//
//   npm run db:seed
//
// No crea categorías, ni fijos, ni movimientos: eso se carga desde la UI.
// Es idempotente — si ya hay Ajustes, no los pisa.

import "dotenv/config";
import { prisma } from "../lib/prisma";

/// Ahorros con los que arranca el sistema.
const SALDO_INICIAL = "1965";

/// Los movimientos anteriores a esta fecha no cuentan para el saldo.
/// El 1 de enero del año en curso deja margen para registrar cosas con fecha
/// atrasada sin que desaparezcan en silencio.
const FECHA_CORTE = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));

async function main() {
  const ajustes = await prisma.ajustes.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      saldoInicial: SALDO_INICIAL,
      fechaCorte: FECHA_CORTE,
    },
    select: { saldoInicial: true, fechaCorte: true },
  });

  const [categorias, recurrentes, movimientos] = await Promise.all([
    prisma.categoria.count(),
    prisma.recurrente.count(),
    prisma.movimiento.count(),
  ]);

  console.log(`Saldo inicial: ${ajustes.saldoInicial}`);
  console.log(`Fecha de corte: ${ajustes.fechaCorte.toISOString().slice(0, 10)}`);
  console.log(`Categorías: ${categorias} · Fijos: ${recurrentes} · Movimientos: ${movimientos}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
