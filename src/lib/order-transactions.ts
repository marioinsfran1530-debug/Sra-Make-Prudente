import { prisma } from "@/lib/prisma";

export class OrderError extends Error {}

// Status em que o estoque JÁ foi descontado (a partir da confirmação).
// Usado para decidir se um cancelamento precisa devolver estoque.
const STOCK_DECREMENTED_STATUSES = [
  "CONFIRMADO",
  "SEPARANDO",
  "PRONTO_RETIRADA",
  "SAIU_ENTREGA",
  "FINALIZADO",
];

type StockRow = { id: string; stockQty: number };

// Confirmação transacional (plano seção 7): verifica e desconta estoque de
// cada item numa única transação, com lock de linha (`FOR UPDATE`), para
// nunca vender duas vezes a última unidade em pedidos concorrentes.
export async function confirmOrder(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new OrderError("Pedido não encontrado.");
    if (order.status === "CONFIRMADO") {
      throw new OrderError("Este pedido já está confirmado.");
    }
    if (order.status === "CANCELADO") {
      throw new OrderError("Não é possível confirmar um pedido cancelado.");
    }

    for (const item of order.items) {
      if (item.variantId) {
        const rows = await tx.$queryRaw<StockRow[]>`
          SELECT id, "stockQty" FROM "ProductVariant" WHERE id = ${item.variantId} FOR UPDATE
        `;
        const variant = rows[0];
        if (!variant || variant.stockQty < item.qty) {
          throw new OrderError(
            `Estoque insuficiente para ${item.name}${
              item.variantName ? ` (${item.variantName})` : ""
            }. Disponível: ${variant?.stockQty ?? 0}, pedido: ${item.qty}.`
          );
        }
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQty: { decrement: item.qty } },
        });
      } else {
        const rows = await tx.$queryRaw<StockRow[]>`
          SELECT id, "stockQty" FROM "Product" WHERE id = ${item.productId} FOR UPDATE
        `;
        const product = rows[0];
        if (!product || product.stockQty < item.qty) {
          throw new OrderError(
            `Estoque insuficiente para ${item.name}. Disponível: ${
              product?.stockQty ?? 0
            }, pedido: ${item.qty}.`
          );
        }
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { decrement: item.qty } },
        });
      }
    }

    return tx.order.update({
      where: { id: orderId },
      data: { status: "CONFIRMADO" },
    });
  });
}

// Cancelamento: se o estoque já tinha sido descontado (pedido estava
// CONFIRMADO ou além), devolve a quantidade — também dentro de uma
// transação única.
export async function cancelOrder(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new OrderError("Pedido não encontrado.");

    const needsRestock = STOCK_DECREMENTED_STATUSES.includes(order.status);

    if (needsRestock) {
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQty: { increment: item.qty } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQty: { increment: item.qty } },
          });
        }
      }
    }

    return tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELADO" },
    });
  });
}
