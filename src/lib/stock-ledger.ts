import type { Prisma } from "@prisma/client";

// Motivo de uma mudança de estoque, gravado pelo gatilho do banco em
// app_security."StockMovement" (ver a migration 20261113230000_stock_movements).
// Sem marca, o gatilho entende como ajuste manual (ou cadastro/exclusão do produto).
export type StockReason =
  | "VENDA"
  | "PEDIDO_CONFIRMADO"
  | "PEDIDO_CANCELADO"
  | "ENTRADA"
  | "ESTORNO_ENTRADA"
  | "AJUSTE_MANUAL";

// Chamar no começo da transação: vale só até ela terminar (set_config local).
export async function tagStockChanges(
  tx: Pick<Prisma.TransactionClient, "$queryRaw">,
  reason: StockReason,
  actorId?: string | null
) {
  await tx.$queryRaw<Array<{ reason: string }>>`
    SELECT set_config('app.stock_reason', ${reason}, true) AS "reason",
           set_config('app.stock_actor', ${actorId ?? ""}, true) AS "actor"
  `;
}
