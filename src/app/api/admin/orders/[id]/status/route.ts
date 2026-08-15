import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { confirmOrder, cancelOrder, OrderError } from "@/lib/order-transactions";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, status } = await requireAdmin("ADMIN");
  if (error) return NextResponse.json({ error }, { status });

  const body = await request.json();
  if (!VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }

  try {
    // Fase 6: CONFIRMADO e CANCELADO passam por transações que
    // descontam/devolvem estoque de forma atômica (plano seção 7).
    if (body.status === "CONFIRMADO") {
      const order = await confirmOrder(params.id);
      return NextResponse.json({ order });
    }

    if (body.status === "CANCELADO") {
      const order = await cancelOrder(params.id);
      return NextResponse.json({ order });
    }

    const order = await prisma.order.update({
      where: { id: params.id },
      data: { status: body.status },
    });
    return NextResponse.json({ order });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro ao atualizar o pedido." }, { status: 500 });
  }
}
