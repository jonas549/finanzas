-- Vincula un movimiento con el fijo que lo originó (cobro de salario, pago de
-- un gasto fijo). Aditiva y anulable: los movimientos existentes quedan con
-- NULL, que es exactamente lo que significan (no vienen de ningún fijo).

-- AlterTable
ALTER TABLE "Movimiento" ADD COLUMN "recurrenteId" TEXT;

-- CreateIndex
CREATE INDEX "Movimiento_recurrenteId_fecha_idx" ON "Movimiento"("recurrenteId", "fecha");

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_recurrenteId_fkey" FOREIGN KEY ("recurrenteId") REFERENCES "Recurrente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
