import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { parseQuickProduct } from "@/lib/quick-product";
import { findProductSlugConflict } from "@/lib/product-url";

export const dynamic = "force-dynamic";

// Cadastro rápido durante uma entrada de estoque. O produto nasce como rascunho
// (inativo, sem estoque e sem custo): estoque e custo entram pela própria entrada
// e o restante (foto, descrição, subcategoria) é completado depois em Produtos.
// Por ser inativo, não aparece na loja nem precisa avisar buscadores.
export async function POST(request: NextRequest) {
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados do produto inválidos." }, { status: 400 });
  }

  const parsed = parseQuickProduct(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;

  const category = await prisma.category.findFirst({
    where: { id: input.categoryId, active: true },
    select: { id: true },
  });
  if (!category) {
    return NextResponse.json({ error: "A categoria escolhida não existe ou está inativa." }, { status: 400 });
  }

  const existing = await prisma.product.findMany({ select: { id: true, name: true, brand: true } });
  if (findProductSlugConflict({ name: input.name, brand: input.brand }, existing)) {
    return NextResponse.json(
      {
        error:
          "Já existe um produto com o mesmo nome e marca. Procure ele na busca ou acrescente cor/modelo ao nome.",
      },
      { status: 409 }
    );
  }

  const product = await prisma.product.create({
    data: {
      name: input.name,
      brand: input.brand,
      sku: input.sku,
      price: input.price,
      stockQty: 0,
      costPrice: null,
      active: false,
      categoryId: input.categoryId,
      categories: { create: [{ categoryId: input.categoryId }] },
      variants: input.variants.length
        ? { create: input.variants.map((name) => ({ name, stockQty: 0 })) }
        : undefined,
    },
    select: {
      id: true,
      name: true,
      brand: true,
      sku: true,
      price: true,
      variants: {
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, sku: true, stockQty: true },
      },
    },
  });

  return NextResponse.json({ product });
}
