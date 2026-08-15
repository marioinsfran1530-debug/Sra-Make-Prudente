import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

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

// NOTA (plano seção 7 / Fase 6): a transição para CONFIRMADO ainda vai
// ganhar a lógica transacional de desconto de estoque na Fase 6
// (prisma.$transaction, com lock de linha e reversão em CANCELADO).
// Por enquanto, esta rota só troca o status — sem mexer em estoque.
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

  const order = await prisma.order.update({
    where: { id: params.id },
    data: { status: body.status },
  });

  return NextResponse.json({ order });
}
