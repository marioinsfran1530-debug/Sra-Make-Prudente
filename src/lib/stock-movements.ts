// Histórico de movimentação de estoque de um produto (lógica pura, para ser testada).
//
// Junta as entradas de estoque (compras recebidas), as vendas/pedidos e os ajustes
// manuais (estoque mudado no cadastro do produto, registrado pelo banco a partir da
// migration 20261113230000) numa linha do tempo única, dizendo o que mexeu no estoque
// e o que não mexeu (pedido aguardando confirmação, cancelado). Ajustes anteriores a
// essa migration não têm registro.

import { stockWasDecremented } from "./order-rules";

export type EntryMovementInput = {
  entryId: string;
  createdAt: string;
  status: string; // ATIVA | ESTORNADA
  reversedAt: string | null;
  origin: string;
  supplier: string;
  qty: number;
  variantName: string | null;
};

export type SaleMovementInput = {
  orderId: string;
  number: number;
  channelLabel: string;
  status: string;
  createdAt: string;
  qty: number;
  variantName: string | null;
  unitPrice: number;
};

// Mudança de estoque que não veio de venda nem de entrada, gravada pelo banco.
export type AdjustmentMovementInput = {
  id: string;
  createdAt: string;
  reason: string; // AJUSTE_MANUAL | CADASTRO | EXCLUIDO (os demais motivos já aparecem como venda/entrada)
  delta: number;
  stockBefore: number;
  stockAfter: number;
  variantName: string | null;
  actorName: string | null;
};

export type MovementKind =
  | "ENTRADA"
  | "ESTORNO"
  | "VENDA"
  | "CANCELADA"
  | "PENDENTE"
  | "AJUSTE"
  | "CADASTRO";

export type StockMovement = {
  key: string;
  at: string;
  kind: MovementKind;
  // Efeito no estoque: positivo entrou, negativo saiu, zero não mexeu.
  delta: number;
  qty: number;
  variantName: string | null;
  title: string;
  detail: string;
  orderId: string | null;
  entryId: string | null;
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  NOVO: "Novo",
  EM_CONFIRMACAO: "Em confirmação",
  CONFIRMADO: "Confirmado",
  SEPARANDO: "Separando",
  PRONTO_RETIRADA: "Pronto para retirada",
  SAIU_ENTREGA: "Saiu para entrega",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

export function orderStatusLabel(status: string) {
  return ORDER_STATUS_LABEL[status] ?? status;
}

function time(iso: string) {
  const value = Date.parse(iso);
  return Number.isFinite(value) ? value : 0;
}

export function buildMovements(
  entries: readonly EntryMovementInput[],
  sales: readonly SaleMovementInput[],
  entryOriginLabel: (origin: string) => string,
  adjustments: readonly AdjustmentMovementInput[] = []
): StockMovement[] {
  const movements: StockMovement[] = [];

  for (const entry of entries) {
    const source = [entryOriginLabel(entry.origin), entry.supplier].filter(Boolean).join(" · ");
    movements.push({
      key: `entry:${entry.entryId}:${entry.variantName ?? ""}:${entry.createdAt}`,
      at: entry.createdAt,
      kind: "ENTRADA",
      delta: entry.qty,
      qty: entry.qty,
      variantName: entry.variantName,
      title: "Entrada de estoque",
      detail: source,
      orderId: null,
      entryId: entry.entryId,
    });
    if (entry.status === "ESTORNADA" && entry.reversedAt) {
      movements.push({
        key: `reversal:${entry.entryId}:${entry.variantName ?? ""}:${entry.reversedAt}`,
        at: entry.reversedAt,
        kind: "ESTORNO",
        delta: -entry.qty,
        qty: entry.qty,
        variantName: entry.variantName,
        title: "Entrada estornada",
        detail: source,
        orderId: null,
        entryId: entry.entryId,
      });
    }
  }

  for (const sale of sales) {
    const base = {
      key: `sale:${sale.orderId}:${sale.variantName ?? ""}:${sale.qty}:${sale.unitPrice}`,
      at: sale.createdAt,
      qty: sale.qty,
      variantName: sale.variantName,
      orderId: sale.orderId,
      entryId: null,
    };
    const where = `Pedido #${sale.number} · ${sale.channelLabel}`;

    if (stockWasDecremented(sale.status)) {
      movements.push({
        ...base,
        kind: "VENDA",
        delta: -sale.qty,
        title: "Venda",
        detail: `${where} · ${orderStatusLabel(sale.status)}`,
      });
    } else if (sale.status === "CANCELADO") {
      movements.push({
        ...base,
        kind: "CANCELADA",
        delta: 0,
        title: "Pedido cancelado",
        detail: `${where} · o estoque volta se já tinha sido baixado`,
      });
    } else {
      movements.push({
        ...base,
        kind: "PENDENTE",
        delta: 0,
        title: "Pedido aguardando",
        detail: `${where} · ${orderStatusLabel(sale.status)} · ainda não baixou o estoque`,
      });
    }
  }

  for (const adjustment of adjustments) {
    const isRegistration = adjustment.reason === "CADASTRO";
    const isManual = adjustment.reason === "AJUSTE_MANUAL";
    const isDeletion = adjustment.reason === "EXCLUIDO";
    if (!isRegistration && !isManual && !isDeletion) continue; // já aparece como venda/entrada

    const change = `de ${adjustment.stockBefore} para ${adjustment.stockAfter}`;
    movements.push({
      key: `adjust:${adjustment.id}`,
      at: adjustment.createdAt,
      kind: isRegistration ? "CADASTRO" : "AJUSTE",
      delta: adjustment.delta,
      qty: Math.abs(adjustment.delta),
      variantName: adjustment.variantName,
      title: isRegistration
        ? "Estoque informado no cadastro"
        : isDeletion
          ? "Produto excluído"
          : "Ajuste manual do estoque",
      detail: [change, adjustment.actorName ? `por ${adjustment.actorName}` : ""].filter(Boolean).join(" · "),
      orderId: null,
      entryId: null,
    });
  }

  return movements.sort((a, b) => time(b.at) - time(a.at) || a.key.localeCompare(b.key));
}

export type MovementSummary = {
  entered: number;
  sold: number;
  soldLastDays: number;
  lastSaleAt: string | null;
  lastEntryAt: string | null;
};

// `entered` e `sold` já descontam os estornos; vendas só contam pedidos que baixaram.
export function summarizeMovements(
  movements: readonly StockMovement[],
  now: number = Date.now(),
  days = 30
): MovementSummary {
  const since = now - days * 24 * 60 * 60 * 1000;
  let entered = 0;
  let sold = 0;
  let soldLastDays = 0;
  let lastSaleAt: string | null = null;
  let lastEntryAt: string | null = null;

  for (const movement of movements) {
    if (movement.kind === "ENTRADA" || movement.kind === "ESTORNO") {
      entered += movement.delta;
      if (movement.kind === "ENTRADA" && (!lastEntryAt || time(movement.at) > time(lastEntryAt))) {
        lastEntryAt = movement.at;
      }
    } else if (movement.kind === "VENDA") {
      sold += movement.qty;
      if (time(movement.at) >= since) soldLastDays += movement.qty;
      if (!lastSaleAt || time(movement.at) > time(lastSaleAt)) lastSaleAt = movement.at;
    }
  }

  return { entered, sold, soldLastDays, lastSaleAt, lastEntryAt };
}
