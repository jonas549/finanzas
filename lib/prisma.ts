import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/prisma/client";

// Al migrar a Postgres en Vercel:
//   npm install @prisma/adapter-pg pg
//   import { PrismaPg } from "@prisma/adapter-pg";
//   const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
// y cambiar `provider = "postgresql"` en prisma/schema.prisma.
function crearCliente() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  });
  return new PrismaClient({ adapter });
}

// En dev, Next.js recarga los módulos en cada cambio; sin este singleton se
// abrirían conexiones nuevas hasta agotar el pool.
const globalParaPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof crearCliente>;
};

export const prisma = globalParaPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = prisma;
}
