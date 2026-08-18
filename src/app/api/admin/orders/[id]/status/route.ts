import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import {
  confirmOrder,
  cancelOrder,
  OrderError,
} from "@/lib/order-transactions";
import { notifyOrderStatus } from "@/lib/order-push";

const VALID_STATUSES = [
  "NOVO",
  "EM_CONFIRMACAO",
  "CONFIRMADO",
  "SEPARANDO",
  "PRONTO_RETIRADA",
  "SAIU_ENTREGA",
  "FINALIZADO",
  "CANCELADO",
];

function getAllowedTransitions(status: string): string[] {
  switch (status) {
    // Fluxo normal atual
    case "NOVO":
      return ["CONFIRMADO", "CANCELADO"];

    case "CONFIRMADO":
      return ["FINALIZADO", "CANCELADO"];

    // Compatibilidade com pedidos antigos
    case "EM_CONFIRMACAO":
      return ["CONFIRMADO", "CANCELADO"];

    case "SEPARANDO":
    case "PRONTO_RETIRADA":
    case "SAIU_ENTREGA":
      return ["FINALIZADO", "CANCELADO"];

    case "FINALIZADO":
    case "CANCELADO":
    default:
      return [];
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, status } = await requireAdmin("EDITOR");

  if (error) {
    return NextResponse.json(
      { error },
      { status }
    );
  }

  const currentOrder = await prisma.order.findUnique({
    where: { id: params.id },
    select: {
      status: true,
    },
  });

  if (!currentOrder) {
    return NextResponse.json(
      { error: "Pedido não encontrado." },
      { status: 404 }
    );
  }

  if (
    currentOrder.status === "FINALIZADO" ||
    currentOrder.status === "CANCELADO"
  ) {
    return NextResponse.json(
      {
        error:
          "Este pedido já foi encerrado e não pode mais ser alterado.",
      },
      { status: 409 }
    );
  }

  const body = await request.json();

  if (!VALID_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: "Status inválido." },
      { status: 400 }
    );
  }

  if (body.status === currentOrder.status) {
    return NextResponse.json(
      {
        error:
          "O pedido já está neste status.",
      },
      { status: 409 }
    );
  }

  const allowed = getAllowedTransitions(
    currentOrder.status
  );

  if (!allowed.includes(body.status)) {
    return NextResponse.json(
      {
        error:
          "Esta mudança de status não é permitida.",
      },
      { status: 409 }
    );
  }

  try {
    // CONFIRMADO = momento em que o estoque é baixado.
    if (body.status === "CONFIRMADO") {
      const order = await confirmOrder(
        params.id
      );

      await notifyOrderStatus({
        number: order.number,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        sessionId: order.sessionId,
        status: order.status,
      });

      return NextResponse.json({
        order,
      });
    }

    // CANCELADO = encerra e devolve estoque
    // caso ele já tenha sido baixado.
    if (body.status === "CANCELADO") {
      const order = await cancelOrder(
        params.id
      );

      await notifyOrderStatus({
        number: order.number,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        sessionId: order.sessionId,
        status: order.status,
      });

      return NextResponse.json({
        order,
      });
    }

    // FINALIZADO = venda concluída.
    // Alimenta as métricas de vendas do Dashboard.
    const order = await prisma.order.update({
      where: {
        id: params.id,
      },
      data: {
        status: body.status,
      },
    });

    await notifyOrderStatus({
      number: order.number,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      sessionId: order.sessionId,
      status: order.status,
    });

    return NextResponse.json({
      order,
    });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json(
        {
          error: err.message,
        },
        { status: 409 }
      );
    }

    console.error(
      "Erro ao atualizar pedido:",
      err
    );

    return NextResponse.json(
      {
        error:
          "Erro ao atualizar o pedido.",
      },
      { status: 500 }
    );
  }
}
