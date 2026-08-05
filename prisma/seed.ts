// Seed mínimo: datos suficientes para ejercitar los tres tipos de movimiento
// y el cierre mensual (mes actual + mes anterior). Todo en dólares.
//
//   npm run db:seed
//
// Es idempotente: borra y reescribe todo. Nunca lo corras contra producción.

import "dotenv/config";
import { prisma } from "../lib/prisma";
import { validarMovimiento } from "../lib/movimientos";
import { validarRecurrente } from "../lib/recurrentes";

const hoy = new Date();
const ANIO = hoy.getUTCFullYear();
const MES = hoy.getUTCMonth();

/// Fechas en UTC a mediodía: así ningún huso horario las corre de día.
function fecha(mes: number, dia: number): Date {
  return new Date(Date.UTC(ANIO, mes, dia, 12));
}

const CATEGORIAS = [
  { nombre: "Sueldo", ambito: "INGRESO", orden: 10 },
  { nombre: "Freelance", ambito: "INGRESO", orden: 20 },
  { nombre: "Otros ingresos", ambito: "INGRESO", orden: 30 },
  { nombre: "Alimentación", ambito: "GASTO", orden: 10 },
  { nombre: "Transporte", ambito: "GASTO", orden: 20 },
  { nombre: "Servicios", ambito: "GASTO", orden: 30 },
  { nombre: "Hogar", ambito: "GASTO", orden: 40 },
  { nombre: "Salud", ambito: "GASTO", orden: 50 },
  { nombre: "Ocio", ambito: "GASTO", orden: 60 },
  { nombre: "Ventas", ambito: "GASTO", orden: 70 },
  { nombre: "Otros gastos", ambito: "GASTO", orden: 80 },
];

async function main() {
  console.log("Limpiando…");
  await prisma.movimiento.deleteMany();
  await prisma.recurrente.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.ajustes.deleteMany();

  // -- Ajustes -------------------------------------------------------------
  await prisma.ajustes.create({
    data: {
      id: 1,
      saldoInicial: "3200",
      fechaCorte: new Date(Date.UTC(ANIO, 0, 1, 12)),
      metaAhorro: "10000",
    },
  });

  // -- Categorías ----------------------------------------------------------
  await prisma.categoria.createMany({ data: CATEGORIAS });
  const categorias = await prisma.categoria.findMany();
  const cat = (nombre: string) => {
    const encontrada = categorias.find((c) => c.nombre === nombre);
    if (!encontrada) throw new Error(`Categoría no sembrada: ${nombre}`);
    return encontrada.id;
  };

  // -- Ingresos y gastos fijos --------------------------------------------
  const recurrentes = [
    {
      tipo: "INGRESO_FIJO" as const,
      nombre: "Sueldo",
      monto: 600,
      frecuenciaPorMes: 2, // quincenal -> 1.200/mes
      diaEstimado: 15,
      categoriaId: cat("Sueldo"),
    },
    {
      tipo: "GASTO_FIJO" as const,
      nombre: "Alquiler",
      monto: 250,
      diaEstimado: 5,
      categoriaId: cat("Hogar"),
    },
    {
      tipo: "GASTO_FIJO" as const,
      nombre: "Internet",
      monto: 35,
      diaEstimado: 10,
      categoriaId: cat("Servicios"),
    },
    {
      tipo: "GASTO_FIJO" as const,
      nombre: "Condominio",
      monto: 40,
      diaEstimado: 3,
      categoriaId: cat("Hogar"),
    },
  ];

  for (const r of recurrentes) {
    await prisma.recurrente.create({ data: validarRecurrente(r) });
  }

  // -- Movimientos ---------------------------------------------------------
  const movimientos = [
    // Mes anterior
    {
      tipo: "VENTA" as const,
      fecha: fecha(MES - 1, 3),
      monto: 200,
      motivo: "Venta de la bicicleta vieja",
      categoriaId: cat("Ventas"),
    },
    {
      tipo: "GASTO_DIARIO" as const,
      fecha: fecha(MES - 1, 8),
      monto: 27.3,
      motivo: "Mercado semanal",
      categoriaId: cat("Alimentación"),
    },
    {
      tipo: "GASTO_DIARIO" as const,
      fecha: fecha(MES - 1, 19),
      monto: 45,
      motivo: "Consulta médica",
      categoriaId: cat("Salud"),
    },
    // Mes actual
    {
      tipo: "VENTA" as const,
      fecha: fecha(MES, 2),
      monto: 150,
      motivo: "Venta del monitor viejo",
      categoriaId: cat("Ventas"),
    },
    {
      tipo: "GASTO_DIARIO" as const,
      fecha: fecha(MES, 3),
      monto: 52.17,
      motivo: "Compra del mercado",
      categoriaId: cat("Alimentación"),
    },
    {
      tipo: "GASTO_DIARIO" as const,
      fecha: fecha(MES, 4),
      monto: 17.4,
      motivo: "Pasajes",
      categoriaId: cat("Transporte"),
    },
    {
      tipo: "GASTO_DIARIO" as const,
      fecha: fecha(MES, 4),
      monto: 22.5,
      motivo: "Cine",
      categoriaId: cat("Ocio"),
    },
    {
      tipo: "INGRESO_EXTRA" as const,
      fecha: fecha(MES, 5),
      monto: 180,
      motivo: "Landing page para un cliente",
      categoriaId: cat("Freelance"),
    },
  ];

  for (const m of movimientos) {
    await prisma.movimiento.create({ data: validarMovimiento(m) });
  }

  console.log(`Categorías:  ${categorias.length}`);
  console.log(`Recurrentes: ${recurrentes.length}`);
  console.log(`Movimientos: ${movimientos.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
