import { prisma } from "@/lib/prisma";
import { ESTIMATED_COST_RATIO } from "@/lib/pricing";
import { monthRange, type FinanceEntryRow, type FinanceKind } from "@/lib/finance";

// Acesso a dados do fechamento do mês (somente servidor).

export async function listFinanceEntries(month: string): Promise<FinanceEntryRow[]> {
  const rows = await prisma.$queryRaw<
    { id: string; month: string; kind: string; label: string; amount: number }[]
  >`
    SELECT "id", "month", "kind", "label", "amount"::float8 AS "amount"
    FROM app_security."FinanceEntry"
    WHERE "month" = ${month}
    ORDER BY "kind", "createdAt", "id"
  `;
  return rows.map((row) => ({ ...row, kind: row.kind as FinanceKind, amount: Number(row.amount) }));
}

export async function countFixedEntries(month: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ total: bigint | number }[]>`
    SELECT COUNT(*) AS "total"
    FROM app_security."FinanceEntry"
    WHERE "month" = ${month} AND "kind" = 'FIXA'
  `;
  return Number(rows[0]?.total ?? 0);
}

export type MonthSales = {
  revenue: number; // soma do total dos pedidos finalizados no mês
  orders: number;
  cogs: number; // custo das mercadorias vendidas (real quando conhecido, senão estimado)
  paymentFees: number; // taxas de cartão/link já registradas nas vendas
  realCostSharePct: number; // parcela dos itens vendidos com custo real
};

// Vendas finalizadas no mês (horário de Brasília), a mesma data de referência
// usada no dashboard e na Curva ABC (updatedAt).
export async function getMonthSales(month: string): Promise<MonthSales> {
  const { start, end } = monthRange(month);

  const orders = await prisma.order.findMany({
    where: { status: "FINALIZADO", updatedAt: { gte: start, lt: end } },
    select: {
      total: true,
      items: {
        select: { productId: true, qty: true, unitPrice: true, unitCost: true, subtotal: true },
      },
    },
  });

  // Custo vigente do produto só é consultado para itens sem o custo gravado na venda.
  const needsProductCost = new Set<string>();
  for (const order of orders) {
    for (const item of order.items) {
      if (item.unitCost === null) needsProductCost.add(item.productId);
    }
  }
  const products = needsProductCost.size
    ? await prisma.product.findMany({
        where: { id: { in: Array.from(needsProductCost) } },
        select: { id: true, costPrice: true },
      })
    : [];
  const currentCost = new Map(products.map((product) => [product.id, product.costPrice]));

  let revenue = 0;
  let cogs = 0;
  let itemsRevenue = 0;
  let itemsRevenueWithRealCost = 0;

  for (const order of orders) {
    revenue += Number(order.total);
    for (const item of order.items) {
      const subtotal = Number(item.subtotal);
      const fromProduct = item.unitCost === null ? currentCost.get(item.productId) ?? null : null;
      const realCost = item.unitCost !== null ? Number(item.unitCost) : fromProduct !== null ? Number(fromProduct) : null;

      const unitCost = realCost !== null ? realCost : Number(item.unitPrice) * ESTIMATED_COST_RATIO;
      cogs += item.qty * unitCost;
      itemsRevenue += subtotal;
      if (realCost !== null) itemsRevenueWithRealCost += subtotal;
    }
  }

  const feeRows = await prisma.$queryRaw<{ fees: number }[]>`
    SELECT COALESCE(SUM(f."feeAmount"), 0)::float8 AS "fees"
    FROM app_security."OrderPaymentFinancial" f
    JOIN "OrderPayment" p ON p."id" = f."orderPaymentId"
    JOIN "Order" o ON o."id" = p."orderId"
    WHERE o."status" = 'FINALIZADO'
      AND o."updatedAt" >= ${start}
      AND o."updatedAt" < ${end}
  `;

  return {
    revenue: Math.round(revenue * 100) / 100,
    orders: orders.length,
    cogs: Math.round(cogs * 100) / 100,
    paymentFees: Math.round(Number(feeRows[0]?.fees ?? 0) * 100) / 100,
    realCostSharePct: itemsRevenue > 0 ? (itemsRevenueWithRealCost / itemsRevenue) * 100 : 0,
  };
}

export type FinanceGoalSetting = {
  desiredProfit: number;
  goalOverride: number | null; // meta digitada; null = vale a meta sugerida
  inherited: boolean; // lucro desejado copiado de um mês anterior (este mês ainda não tem o seu)
};

export const EMPTY_FINANCE_GOAL: FinanceGoalSetting = { desiredProfit: 0, goalOverride: null, inherited: false };

// Lucro desejado e meta digitada do mês. Sem registro no mês, o lucro desejado do
// mês anterior mais recente vale como ponto de partida, sem copiar a meta digitada.
export async function getFinanceGoal(month: string): Promise<FinanceGoalSetting> {
  const rows = await prisma.$queryRaw<
    { month: string; desiredProfit: number; goalOverride: number | null }[]
  >`
    SELECT "month", "desiredProfit"::float8 AS "desiredProfit", "goalOverride"::float8 AS "goalOverride"
    FROM app_security."FinanceGoal"
    WHERE "month" <= ${month}
    ORDER BY "month" DESC
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return EMPTY_FINANCE_GOAL;

  const desiredProfit = Number(row.desiredProfit);
  if (row.month === month) {
    return {
      desiredProfit,
      goalOverride: row.goalOverride === null ? null : Number(row.goalOverride),
      inherited: false,
    };
  }
  return { desiredProfit, goalOverride: null, inherited: true };
}

export async function saveFinanceGoal(month: string, desiredProfit: number, goalOverride: number | null) {
  // Duas instruções (em vez de um parâmetro nulo) para o tipo da coluna nunca ficar ambíguo.
  if (goalOverride === null) {
    await prisma.$executeRaw`
      INSERT INTO app_security."FinanceGoal" ("month", "desiredProfit", "goalOverride", "updatedAt")
      VALUES (${month}, ${desiredProfit}, NULL, NOW())
      ON CONFLICT ("month") DO UPDATE
      SET "desiredProfit" = EXCLUDED."desiredProfit", "goalOverride" = NULL, "updatedAt" = NOW()
    `;
    return;
  }
  await prisma.$executeRaw`
    INSERT INTO app_security."FinanceGoal" ("month", "desiredProfit", "goalOverride", "updatedAt")
    VALUES (${month}, ${desiredProfit}, ${goalOverride}, NOW())
    ON CONFLICT ("month") DO UPDATE
    SET "desiredProfit" = EXCLUDED."desiredProfit",
        "goalOverride" = EXCLUDED."goalOverride",
        "updatedAt" = NOW()
  `;
}
