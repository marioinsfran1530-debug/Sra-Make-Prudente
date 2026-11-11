import { prisma } from "@/lib/prisma";
import {
  allocateFreight,
  canReverseLine,
  costAfterReversal,
  landedUnitCost,
  round2,
  weightedAverageCost,
  type NormalizedEntry,
} from "@/lib/stock-entry";

// Acesso a dados das entradas de estoque (somente servidor). As tabelas ficam no
// schema privado app_security e são acessadas com SQL direto, como o Financeiro.

export class StockEntryError extends Error {}

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  stockQty: number;
  costPrice: number | null;
  price: number;
  promoPrice: number | null;
};
type VariantRow = { id: string; name: string; sku: string | null; stockQty: number; active: boolean; productId: string };

const TX_OPTIONS = { timeout: 30000, maxWait: 10000 } as const;

async function advisoryLock(tx: Pick<typeof prisma, "$queryRaw">, key: string) {
  // O SELECT embrulhado devolve um inteiro: o Prisma não lê o tipo "void" da função.
  await tx.$queryRaw<Array<{ locked: number }>>`
    SELECT 1::int AS locked
    FROM (
      SELECT pg_advisory_xact_lock(hashtext(${key}))
    ) AS advisory_lock
  `;
}

// ---------- Criar entrada ----------

export async function createStockEntry(input: NormalizedEntry, createdById: string) {
  // Ordem fixa para travar sempre na mesma sequência (evita deadlock).
  const lines = [...input.lines].sort((a, b) =>
    `${a.productId}:${a.variantId ?? ""}`.localeCompare(`${b.productId}:${b.variantId ?? ""}`)
  );
  const shares = allocateFreight(lines, input.freight);
  const productIds = Array.from(new Set(lines.map((line) => line.productId))).sort();
  const priceApplied = new Set<string>(); // o preço é do produto: muda uma vez só

  return prisma.$transaction(async (tx) => {
    await advisoryLock(tx, `stock-entry:${input.idempotencyKey}`);

    const existing = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM app_security."StockEntry" WHERE "idempotencyKey" = ${input.idempotencyKey} LIMIT 1
    `;
    if (existing[0]) return { id: existing[0].id, duplicate: true };

    // Uma entrada por vez por produto: o custo médio depende do estoque e do
    // custo no momento, então duas entradas simultâneas do mesmo produto esperam.
    for (const productId of productIds) await advisoryLock(tx, `stock-entry-product:${productId}`);

    const created = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO app_security."StockEntry"
        ("idempotencyKey", "entryDate", "origin", "supplier", "freight", "notes", "createdById")
      VALUES
        (${input.idempotencyKey}, ${input.entryDate}::date, ${input.origin}, ${input.supplier},
         ${input.freight}, ${input.notes}, ${createdById})
      RETURNING "id"
    `;
    const entryId = created[0].id;

    for (const [index, line] of lines.entries()) {
      const products = await tx.$queryRaw<ProductRow[]>`
        SELECT "id", "name", "sku", "stockQty", "costPrice"::float8 AS "costPrice",
               "price"::float8 AS "price", "promoPrice"::float8 AS "promoPrice"
        FROM "Product" WHERE "id" = ${line.productId}
      `;
      const product = products[0];
      if (!product) throw new StockEntryError("Um dos produtos não existe mais. Atualize a tela.");

      const variants = await tx.$queryRaw<VariantRow[]>`
        SELECT "id", "name", "sku", "stockQty", "active", "productId"
        FROM "ProductVariant" WHERE "productId" = ${line.productId} AND "active" = true
      `;

      let variant: VariantRow | null = null;
      if (variants.length > 0) {
        if (!line.variantId) {
          throw new StockEntryError(`Escolha a variação de "${product.name}".`);
        }
        variant = variants.find((candidate) => candidate.id === line.variantId) ?? null;
        if (!variant) throw new StockEntryError(`A variação escolhida de "${product.name}" não existe mais.`);
      } else if (line.variantId) {
        throw new StockEntryError(`"${product.name}" não tem mais variações. Atualize a tela.`);
      }

      // Estoque total do produto antes da entrada (soma das variações, se houver).
      const stockBefore = variants.length > 0
        ? variants.reduce((sum, item) => sum + Math.max(0, item.stockQty), 0)
        : Math.max(0, product.stockQty);

      const landed = landedUnitCost(line, shares[index]);
      const costBefore = product.costPrice;
      const costAfter = weightedAverageCost({ stockBefore, costBefore, qty: line.qty, landedUnitCost: landed });

      if (variant) {
        await tx.$executeRaw`
          UPDATE "ProductVariant" SET "stockQty" = "stockQty" + ${line.qty}, "updatedAt" = NOW()
          WHERE "id" = ${variant.id}
        `;
      } else {
        await tx.$executeRaw`
          UPDATE "Product" SET "stockQty" = "stockQty" + ${line.qty}, "updatedAt" = NOW()
          WHERE "id" = ${product.id}
        `;
      }
      await tx.$executeRaw`
        UPDATE "Product" SET "costPrice" = ${costAfter}, "updatedAt" = NOW() WHERE "id" = ${product.id}
      `;

      // Preço de venda novo (opcional). Só mexe se for diferente do atual e nunca
      // deixa o preço normal igual ou abaixo do promocional (a loja não aceita isso).
      let priceBefore: number | null = null;
      let priceAfter: number | null = null;
      if (line.newPrice !== null && !priceApplied.has(product.id) && Math.abs(line.newPrice - product.price) >= 0.005) {
        if (product.promoPrice !== null && line.newPrice <= product.promoPrice) {
          throw new StockEntryError(
            `O novo preço de "${product.name}" precisa ser maior que o preço promocional (R$ ${product.promoPrice.toFixed(2).replace(".", ",")}).`
          );
        }
        await tx.$executeRaw`
          UPDATE "Product" SET "price" = ${line.newPrice}, "updatedAt" = NOW() WHERE "id" = ${product.id}
        `;
        priceBefore = product.price;
        priceAfter = line.newPrice;
      }
      if (line.newPrice !== null) priceApplied.add(product.id);

      await tx.$executeRaw`
        INSERT INTO app_security."StockEntryItem"
          ("entryId", "position", "productId", "variantId", "productName", "variantName", "sku",
           "qty", "unitCost", "landedUnitCost", "stockBefore", "costBefore", "costAfter",
           "priceBefore", "priceAfter")
        VALUES
          (${entryId}, ${index}, ${product.id}, ${variant?.id ?? null}, ${product.name}, ${variant?.name ?? null},
           ${variant?.sku ?? product.sku}, ${line.qty}, ${line.unitCost}, ${landed}, ${stockBefore},
           ${costBefore}, ${costAfter}, ${priceBefore}, ${priceAfter})
      `;
    }

    return { id: entryId, duplicate: false };
  }, TX_OPTIONS);
}

// ---------- Estornar entrada ----------

type ItemRow = {
  id: string;
  position: number;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  qty: number;
  costBefore: number | null;
  costAfter: number | null;
  priceBefore: number | null;
  priceAfter: number | null;
};

export async function reverseStockEntry(entryId: string, reversedById: string, note: string) {
  return prisma.$transaction(async (tx) => {
    await advisoryLock(tx, `stock-entry-reverse:${entryId}`);

    const entries = await tx.$queryRaw<{ id: string; status: string }[]>`
      SELECT "id", "status" FROM app_security."StockEntry" WHERE "id" = ${entryId} LIMIT 1
    `;
    const entry = entries[0];
    if (!entry) throw new StockEntryError("Entrada não encontrada.");
    if (entry.status === "ESTORNADA") return { id: entry.id, alreadyReversed: true };

    const items = await tx.$queryRaw<ItemRow[]>`
      SELECT "id", "position", "productId", "variantId", "productName", "variantName", "qty",
             "costBefore"::float8 AS "costBefore", "costAfter"::float8 AS "costAfter",
             "priceBefore"::float8 AS "priceBefore", "priceAfter"::float8 AS "priceAfter"
      FROM app_security."StockEntryItem"
      WHERE "entryId" = ${entryId}
      ORDER BY "position" DESC
    `;

    const productIds = Array.from(new Set(items.map((item) => item.productId))).sort();
    for (const productId of productIds) await advisoryLock(tx, `stock-entry-product:${productId}`);

    // Da última linha para a primeira, para o custo voltar passo a passo.
    for (const item of items) {
      const label = item.variantName ? `${item.productName} (${item.variantName})` : item.productName;

      const current = item.variantId
        ? await tx.$queryRaw<{ stockQty: number }[]>`
            SELECT "stockQty" FROM "ProductVariant" WHERE "id" = ${item.variantId} FOR UPDATE
          `
        : await tx.$queryRaw<{ stockQty: number }[]>`
            SELECT "stockQty" FROM "Product" WHERE "id" = ${item.productId} FOR UPDATE
          `;
      const row = current[0];
      if (!row) throw new StockEntryError(`"${label}" não existe mais; não dá para estornar esta entrada.`);
      if (!canReverseLine(row.stockQty, item.qty)) {
        throw new StockEntryError(
          `Não dá para estornar: "${label}" já teve unidades vendidas ou ajustadas (estoque atual ${row.stockQty}, entrada de ${item.qty}). Ajuste o estoque do produto manualmente.`
        );
      }

      if (item.variantId) {
        await tx.$executeRaw`
          UPDATE "ProductVariant" SET "stockQty" = "stockQty" - ${item.qty}, "updatedAt" = NOW()
          WHERE "id" = ${item.variantId}
        `;
      } else {
        await tx.$executeRaw`
          UPDATE "Product" SET "stockQty" = "stockQty" - ${item.qty}, "updatedAt" = NOW()
          WHERE "id" = ${item.productId}
        `;
      }

      const products = await tx.$queryRaw<{ costPrice: number | null }[]>`
        SELECT "costPrice"::float8 AS "costPrice" FROM "Product" WHERE "id" = ${item.productId}
      `;
      const plan = costAfterReversal({
        currentCost: products[0]?.costPrice ?? null,
        costAfter: item.costAfter,
        costBefore: item.costBefore,
      });
      if (plan.restore) {
        await tx.$executeRaw`
          UPDATE "Product" SET "costPrice" = ${plan.cost === null ? null : round2(plan.cost)}, "updatedAt" = NOW()
          WHERE "id" = ${item.productId}
        `;
      }

      // Preço de venda: só volta se ninguém o mudou depois da entrada e se o preço
      // antigo ainda fica acima do promocional atual.
      if (item.priceBefore !== null && item.priceAfter !== null) {
        const prices = await tx.$queryRaw<{ price: number; promoPrice: number | null }[]>`
          SELECT "price"::float8 AS "price", "promoPrice"::float8 AS "promoPrice"
          FROM "Product" WHERE "id" = ${item.productId}
        `;
        const now = prices[0];
        if (
          now &&
          Math.abs(now.price - item.priceAfter) < 0.005 &&
          (now.promoPrice === null || item.priceBefore > now.promoPrice)
        ) {
          await tx.$executeRaw`
            UPDATE "Product" SET "price" = ${item.priceBefore}, "updatedAt" = NOW() WHERE "id" = ${item.productId}
          `;
        }
      }
    }

    await tx.$executeRaw`
      UPDATE app_security."StockEntry"
      SET "status" = 'ESTORNADA', "reversedAt" = NOW(), "reversedById" = ${reversedById},
          "reversalNote" = ${note.trim().slice(0, 200)}
      WHERE "id" = ${entryId}
    `;

    return { id: entryId, alreadyReversed: false };
  }, TX_OPTIONS);
}

// ---------- Histórico ----------

export type StockEntryListItem = {
  id: string;
  entryDate: string;
  origin: string;
  supplier: string;
  freight: number;
  notes: string;
  status: "ATIVA" | "ESTORNADA";
  createdAt: Date;
  reversedAt: Date | null;
  reversalNote: string | null;
  lines: {
    productName: string;
    variantName: string | null;
    qty: number;
    unitCost: number;
    landedUnitCost: number;
    priceBefore: number | null;
    priceAfter: number | null;
  }[];
};

export async function listStockEntries(limit = 60): Promise<StockEntryListItem[]> {
  const entries = await prisma.$queryRaw<Omit<StockEntryListItem, "lines">[]>`
    SELECT "id", "entryDate"::text AS "entryDate", "origin", "supplier", "freight"::float8 AS "freight",
           "notes", "status", "createdAt", "reversedAt", "reversalNote"
    FROM app_security."StockEntry"
    ORDER BY "entryDate" DESC, "createdAt" DESC
    LIMIT ${limit}
  `;
  if (entries.length === 0) return [];

  const ids = entries.map((entry) => entry.id);
  const items = await prisma.$queryRaw<
    {
      entryId: string;
      productName: string;
      variantName: string | null;
      qty: number;
      unitCost: number;
      landedUnitCost: number;
      priceBefore: number | null;
      priceAfter: number | null;
    }[]
  >`
    SELECT "entryId", "productName", "variantName", "qty",
           "unitCost"::float8 AS "unitCost", "landedUnitCost"::float8 AS "landedUnitCost",
           "priceBefore"::float8 AS "priceBefore", "priceAfter"::float8 AS "priceAfter"
    FROM app_security."StockEntryItem"
    WHERE "entryId" = ANY(${ids}::text[])
    ORDER BY "entryId", "position"
  `;

  return entries.map((entry) => ({
    ...entry,
    freight: Number(entry.freight),
    lines: items
      .filter((item) => item.entryId === entry.id)
      .map((item) => ({
        productName: item.productName,
        variantName: item.variantName,
        qty: item.qty,
        unitCost: Number(item.unitCost),
        landedUnitCost: Number(item.landedUnitCost),
        priceBefore: item.priceBefore === null ? null : Number(item.priceBefore),
        priceAfter: item.priceAfter === null ? null : Number(item.priceAfter),
      })),
  }));
}
