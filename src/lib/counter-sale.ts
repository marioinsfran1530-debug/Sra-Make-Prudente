import { prisma } from "@/lib/prisma";
import { resolveOrderUnitPrice } from "@/lib/order-validation";

export class CounterSaleError extends Error {}

type CounterSaleItemInput = {
  productId: string;
  variantId?: string | null;
  qty: number;
};

type CounterSalePaymentInput = {
  method: "PIX" | "DINHEIRO" | "DEBITO" | "CREDITO";
  amount: number;
};

type CreateCounterSaleInput = {
  items: CounterSaleItemInput[];
  payments: CounterSalePaymentInput[];
  discount?: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  createdById: string;
  idempotencyKey: string;
};

type StockRow = { id: string; stockQty: number };

function cents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function createCounterSale(input: CreateCounterSaleInput) {
  if (input.items.length === 0) throw new CounterSaleError("Adicione pelo menos um produto.");
  if (input.items.length > 100) throw new CounterSaleError("A venda possui itens demais.");

  const idempotencyKey = input.idempotencyKey.trim().slice(0, 160);
  if (idempotencyKey.length < 8) {
    throw new CounterSaleError("Identificador da venda inválido. Atualize a tela e tente novamente.");
  }
  const saleSessionId = `counter-sale:${idempotencyKey}`;

  const normalizedItems = input.items.map((item) => ({
    productId: item.productId.trim(),
    variantId: item.variantId?.trim() || null,
    qty: Math.floor(Number(item.qty)),
  }));

  for (const item of normalizedItems) {
    if (!item.productId || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 999) {
      throw new CounterSaleError("Há um item com quantidade inválida.");
    }
  }

  const discount = cents(Number(input.discount ?? 0));
  if (!Number.isFinite(discount) || discount < 0) {
    throw new CounterSaleError("Desconto inválido.");
  }

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw<Array<{ locked: number }>>`
      SELECT 1::int AS locked
      FROM (
        SELECT pg_advisory_xact_lock(hashtext(${saleSessionId}))
      ) AS advisory_lock
    `;

    const existingOrder = await tx.order.findFirst({
      where: { sessionId: saleSessionId, origin: "loja_fisica" },
      include: { items: true, payments: true },
    });
    if (existingOrder) return existingOrder;

    const productIds = Array.from(new Set(normalizedItems.map((item) => item.productId)));
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, active: true },
      include: { variants: true },
    });
    const productById = new Map(products.map((product) => [product.id, product]));

    if (products.length !== productIds.length) {
      throw new CounterSaleError("Um dos produtos não existe ou está inativo.");
    }

    const requestedByLine = new Map<string, number>();
    const prepared = normalizedItems.map((item) => {
      const product = productById.get(item.productId)!;
      const activeVariants = product.variants.filter((variant) => variant.active);

      if (activeVariants.length > 0 && !item.variantId) {
        throw new CounterSaleError(`Escolha a variação de ${product.name}.`);
      }

      const variant = item.variantId
        ? activeVariants.find((candidate) => candidate.id === item.variantId)
        : null;

      if (item.variantId && !variant) {
        throw new CounterSaleError(`Variação inválida ou inativa para ${product.name}.`);
      }

      const lineKey = variant ? `v:${variant.id}` : `p:${product.id}`;
      requestedByLine.set(lineKey, (requestedByLine.get(lineKey) ?? 0) + item.qty);

      const unitPrice = resolveOrderUnitPrice({
        productPrice: Number(product.price),
        productPromoPrice: product.promoPrice === null ? null : Number(product.promoPrice),
        variantPrice: variant?.price === null || variant?.price === undefined ? null : Number(variant.price),
        variantPromoPrice:
          variant?.promoPrice === null || variant?.promoPrice === undefined
            ? null
            : Number(variant.promoPrice),
      });

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new CounterSaleError(`Preço inválido para ${product.name}.`);
      }

      return {
        product,
        variant,
        lineKey,
        qty: item.qty,
        unitPrice: cents(unitPrice),
      };
    });

    const lines = Array.from(requestedByLine.entries()).sort(([a], [b]) => a.localeCompare(b));
    for (const [lineKey, qty] of lines) {
      if (lineKey.startsWith("v:")) {
        const id = lineKey.slice(2);
        const rows = await tx.$queryRaw<StockRow[]>`
          SELECT id, "stockQty" FROM "ProductVariant" WHERE id = ${id} FOR UPDATE
        `;
        const row = rows[0];
        if (!row || row.stockQty < qty) {
          throw new CounterSaleError(`Estoque insuficiente. Disponível: ${row?.stockQty ?? 0}.`);
        }
      } else {
        const id = lineKey.slice(2);
        const rows = await tx.$queryRaw<StockRow[]>`
          SELECT id, "stockQty" FROM "Product" WHERE id = ${id} FOR UPDATE
        `;
        const row = rows[0];
        if (!row || row.stockQty < qty) {
          throw new CounterSaleError(`Estoque insuficiente. Disponível: ${row?.stockQty ?? 0}.`);
        }
      }
    }

    const orderItems = prepared.map(({ product, variant, qty, unitPrice }) => ({
      productId: product.id,
      variantId: variant?.id ?? null,
      name: product.name,
      brand: product.brand,
      sku: variant?.sku ?? product.sku,
      variantName: variant?.name ?? null,
      qty,
      unitPrice,
      unitCost: product.costPrice,
      subtotal: cents(unitPrice * qty),
    }));

    const subtotal = cents(orderItems.reduce((sum, item) => sum + item.subtotal, 0));
    if (discount > subtotal) throw new CounterSaleError("O desconto não pode ser maior que o subtotal.");
    const total = cents(subtotal - discount);

    if (!Array.isArray(input.payments) || input.payments.length === 0) {
      throw new CounterSaleError("Informe a forma de pagamento.");
    }

    const payments = input.payments.map((payment) => ({
      method: payment.method,
      amount: cents(Number(payment.amount)),
    }));

    for (const payment of payments) {
      if (!["PIX", "DINHEIRO", "DEBITO", "CREDITO"].includes(payment.method)) {
        throw new CounterSaleError("Forma de pagamento inválida para venda de balcão.");
      }
      if (!Number.isFinite(payment.amount) || payment.amount <= 0) {
        throw new CounterSaleError("Valor de pagamento inválido.");
      }
    }

    const paid = cents(payments.reduce((sum, payment) => sum + payment.amount, 0));
    if (paid !== total) {
      throw new CounterSaleError(`O total dos pagamentos (${paid.toFixed(2)}) deve ser igual à venda (${total.toFixed(2)}).`);
    }

    for (const [lineKey, qty] of lines) {
      if (lineKey.startsWith("v:")) {
        await tx.productVariant.update({
          where: { id: lineKey.slice(2) },
          data: { stockQty: { decrement: qty } },
        });
      } else {
        await tx.product.update({
          where: { id: lineKey.slice(2) },
          data: { stockQty: { decrement: qty } },
        });
      }
    }

    const primaryPayment = payments[0].method;
    const customerName = input.customerName?.trim().slice(0, 120) || "Consumidor final";
    const customerPhone = input.customerPhone?.replace(/\D/g, "").slice(0, 20) || "";
    const notes = input.notes?.trim().slice(0, 500) || null;

    const order = await tx.order.create({
      data: {
        customerName,
        customerPhone,
        subtotal,
        discount,
        deliveryFee: 0,
        total,
        deliveryType: "RETIRADA",
        payment: primaryPayment,
        channel: "LOJA_FISICA",
        createdById: input.createdById,
        notes,
        origin: "loja_fisica",
        sessionId: saleSessionId,
        status: "FINALIZADO",
        items: { create: orderItems },
        payments: { create: payments },
      },
      include: { items: true, payments: true },
    });

    await tx.analyticsEvent.create({
      data: {
        event: "order_finalized",
        sessionId: saleSessionId,
        value: total,
        context: `pedido:${order.number}`,
        origin: "loja_fisica",
      },
    });

    return order;
  });
}
