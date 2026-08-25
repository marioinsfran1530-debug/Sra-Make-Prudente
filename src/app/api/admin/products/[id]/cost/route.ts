import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  const body = (await request.json()) as { costPrice?: unknown };
  const raw = body.costPrice;
  const costPrice = raw === undefined || raw === null || raw === "" ? null : Number(raw);

  if (costPrice !== null && (!Number.isFinite(costPrice) || costPrice < 0)) {
    return NextResponse.json({ error: "O custo deve ser igual ou maior que zero." }, { status: 400 });
  }

  const product = await prisma.product.update({
    where: { id },
    data: { costPrice },
    select: { id: true, costPrice: true },
  }).catch(() => null);

  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    product: {
      id: product.id,
      costPrice: product.costPrice === null ? null : Number(product.costPrice),
    },
  });
}
