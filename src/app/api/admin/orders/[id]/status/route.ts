import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { confirmOrder, cancelOrder, OrderError } from "@/lib/order-transactions";
import { canTransitionOrder, isClosedOrderStatus, isValidOrderStatus } from "@/lib/order-rules";
import { notifyOrderStatus } from "@/lib/order-push";

async function snapshotOrderCosts(orderId: string) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { id: true, productId: true, unitCost: true },
  });

  const missingCostItems = items.filter((item) => item.unitCost === null);
  if (missingCostItems.length === 0) return;

  const productIds = Array.from(new Set(missingCostItems.map((item) => item.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, costPrice: true },
  });
  const costByProduct = new Map(products.map((product) => [product.id, product.costPrice]));

  const updates = missingCostItems
    .map((item) => {
      const cost = costByProduct.get(item.productId);
      if (cost === null || cost === undefined) return null;
      return prisma.orderItem.update({
        where: { id: item.id },
        data: { unitCost: cost },
      });
    })
    .filter((update): update is NonNullable<typeof update> => Boolean(update));

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status } = await requireAdmin("EDITOR");

  if (error) return NextResponse.json({ error }, { status });

  const currentOrder = await prisma.order.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!currentOrder) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  if (isClosedOrderStatus(currentOrder.status)) {
    return NextResponse.json(
      { error: "Este pedido já foi encerrado e não pode mais ser alterado." },
      { status: 409 }
    );
  }

  const body = await request.json();

  if (!isValidOrderStatus(body.status)) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }

  if (body.status === currentOrder.status) {
    return NextResponse.json({ error: "O pedido já está neste status." }, { status: 409 });
  }

  if (!canTransitionOrder(currentOrder.status, body.status)) {
    return NextResponse.json({ error: "Esta mudança de status não é permitida." }, { status: 409 });
  }

  try {
    let order;
    if (body.status === "CONFIRMADO") {
      order = await confirmOrder(id);
    } else if (body.status === "CANCELADO") {
      order = await cancelOrder(id);
    } else {
      order = await prisma.order.update({ where: { id }, data: { status: body.status } });
    }

    if (body.status === "FINALIZADO") {
      await snapshotOrderCosts(id);

      await prisma.analyticsEvent.create({
        data: {
          event: "order_finalized",
          sessionId: order.sessionId ?? `order:${order.id}`,
          value: order.total,
          context: `pedido:${order.number}`,
          origin: order.origin,
          landingPage: order.landingPage,
          utmSource: order.utmSource,
          utmMedium: order.utmMedium,
          utmCampaign: order.utmCampaign,
          utmContent: order.utmContent,
        },
      });
    }

    await notifyOrderStatus({
      number: order.number,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      sessionId: order.sessionId,
      status: order.status,
    });

    return NextResponse.json({ order });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }

    console.error("Erro ao atualizar pedido:", err);
    return NextResponse.json({ error: "Erro ao atualizar o pedido." }, { status: 500 });
  }
}
