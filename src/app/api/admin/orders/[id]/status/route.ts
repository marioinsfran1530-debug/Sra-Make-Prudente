import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { confirmOrder, cancelOrder, OrderError } from "@/lib/order-transactions";
import { canTransitionOrder, isValidOrderStatus } from "@/lib/order-rules";
import {
  cancelReasonLabel,
  isOrderCancelReasonCode,
  isRefundStatus,
  type RefundStatus,
} from "@/lib/order-cancellation";
import { notifyOrderStatus } from "@/lib/order-push";
import { syncCrmFromOrderStatus } from "@/lib/crm-order-sync";

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

  if (updates.length > 0) await prisma.$transaction(updates);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error, status } = await requireAdmin("EDITOR");
  if (error || !session) return NextResponse.json({ error }, { status });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const currentOrder = await prisma.order.findUnique({
    where: { id },
    select: { status: true, total: true, refundStatus: true },
  });

  if (!currentOrder) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  // Atualização posterior do controle de estorno/devolução.
  if (body.action === "refund") {
    if (currentOrder.status !== "CANCELADO") {
      return NextResponse.json({ error: "O estorno só pode ser atualizado em uma venda cancelada." }, { status: 409 });
    }
    if (!isRefundStatus(body.refundStatus)) {
      return NextResponse.json({ error: "Status de estorno inválido." }, { status: 400 });
    }

    const refundStatus = body.refundStatus as RefundStatus;
    const order = await prisma.order.update({
      where: { id },
      data: {
        refundStatus,
        refundUpdatedAt: refundStatus === "REFUNDED" ? new Date() : null,
      },
    });
    return NextResponse.json({ order });
  }

  if (!isValidOrderStatus(body.status)) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }

  if (body.status === currentOrder.status) {
    return NextResponse.json({ error: "O pedido já está neste status." }, { status: 409 });
  }

  const cancellingFinalized = currentOrder.status === "FINALIZADO" && body.status === "CANCELADO";

  if (currentOrder.status === "CANCELADO") {
    return NextResponse.json({ error: "Este pedido já foi cancelado e não pode mais ser alterado." }, { status: 409 });
  }

  if (currentOrder.status === "FINALIZADO" && !cancellingFinalized) {
    return NextResponse.json(
      { error: "Uma venda finalizada só pode ser revertida por cancelamento auditado." },
      { status: 409 }
    );
  }

  if (!cancellingFinalized && !canTransitionOrder(currentOrder.status, body.status)) {
    return NextResponse.json({ error: "Esta mudança de status não é permitida." }, { status: 409 });
  }

  try {
    let order;
    if (body.status === "CONFIRMADO") {
      order = await confirmOrder(id);
    } else if (body.status === "CANCELADO") {
      if (!isOrderCancelReasonCode(body.cancelReasonCode)) {
        return NextResponse.json({ error: "Informe o motivo do cancelamento." }, { status: 400 });
      }

      const reasonText = typeof body.cancelReasonText === "string"
        ? body.cancelReasonText.trim().slice(0, 500)
        : "";
      if (body.cancelReasonCode === "OTHER" && reasonText.length < 3) {
        return NextResponse.json({ error: "Descreva o motivo do cancelamento." }, { status: 400 });
      }

      const refundStatus: RefundStatus = cancellingFinalized
        ? (isRefundStatus(body.refundStatus) ? body.refundStatus : "PENDING")
        : "NOT_REQUIRED";

      order = await cancelOrder(id, {
        reasonCode: body.cancelReasonCode,
        reasonText,
        cancelledById: session.id,
        refundStatus,
      });

      if (cancellingFinalized) {
        await prisma.analyticsEvent.create({
          data: {
            event: "order_cancelled",
            sessionId: order.sessionId ?? `order:${order.id}`,
            value: order.total,
            context: `pedido:${order.number};motivo:${cancelReasonLabel(body.cancelReasonCode)}`,
            origin: order.origin,
            landingPage: order.landingPage,
            utmSource: order.utmSource,
            utmMedium: order.utmMedium,
            utmCampaign: order.utmCampaign,
            utmContent: order.utmContent,
          },
        });
      }
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

    try {
      await syncCrmFromOrderStatus(id);
    } catch (crmError) {
      console.error("Falha ao sincronizar pedido com CRM:", crmError);
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
