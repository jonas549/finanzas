import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

function crearCliente() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Falta DATABASE_URL. En local copia .env.example a .env; en Vercel configúrala como variable de entorno.",
    );
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
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
