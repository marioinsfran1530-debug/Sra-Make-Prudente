import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  const body = await request.json();

  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      name: body.name,
      brand: body.brand,
      sku: body.sku || null,
      description: body.description || null,
      price: body.price,
      promoPrice: body.promoPrice || null,
      // stockQty é a fonte da verdade do estoque (plano seção 5) — o admin
      // edita quantidade, nunca o rótulo (DISPONIVEL/ULTIMAS/INDISPONIVEL).
      stockQty: body.stockQty,
      featured: !!body.featured,
      isNew: !!body.isNew,
      bestSeller: !!body.bestSeller,
      active: body.active,
      categoryId: body.categoryId,
      subcategoryId: body.subcategoryId || null,
    },
  });

  return NextResponse.json({ product });
}

// Soft delete — nunca exclusão física (plano seção 19), para preservar
// histórico de pedidos que referenciam este produto.
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  await prisma.product.update({
    where: { id: params.id },
    data: { active: false },
  });

  return NextResponse.json({ ok: true });
}
