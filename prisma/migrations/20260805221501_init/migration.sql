-- CreateTable
CREATE TABLE "Ajustes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "saldoInicial" DECIMAL NOT NULL,
    "fechaCorte" DATETIME NOT NULL,
    "metaAhorro" DECIMAL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "ambito" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Recurrente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "monto" DECIMAL NOT NULL,
    "frecuenciaPorMes" INTEGER NOT NULL DEFAULT 1,
    "diaEstimado" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "categoriaId" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "Recurrente_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Movimiento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "monto" DECIMAL NOT NULL,
    "motivo" TEXT,
    "categoriaId" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "Movimiento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nombre_key" ON "Categoria"("nombre");

-- CreateIndex
CREATE INDEX "Categoria_activa_orden_idx" ON "Categoria"("activa", "orden");

-- CreateIndex
CREATE INDEX "Recurrente_tipo_activo_idx" ON "Recurrente"("tipo", "activo");

-- CreateIndex
CREATE INDEX "Recurrente_categoriaId_idx" ON "Recurrente"("categoriaId");

-- CreateIndex
CREATE INDEX "Movimiento_fecha_idx" ON "Movimiento"("fecha");

-- CreateIndex
CREATE INDEX "Movimiento_tipo_fecha_idx" ON "Movimiento"("tipo", "fecha");

-- CreateIndex
CREATE INDEX "Movimiento_categoriaId_fecha_idx" ON "Movimiento"("categoriaId", "fecha");
