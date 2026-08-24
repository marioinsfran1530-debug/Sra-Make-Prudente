import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { indexNowPaths, notifyIndexNow } from "@/lib/indexnow";
import { validateProductInput } from "@/lib/product-input";

function normalizeCategoryIds(primaryCategoryId: string, categoryIds: unknown) {
  const ids = Array.isArray(categoryIds)
    ? categoryIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];

  return Array.from(new Set([primaryCategoryId, ...ids]));
}

export async function GET() {
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  const products = await prisma.product.findMany({
    include: {
      category: true,
      subcategory: true,
      categories: { include: { category: true } },
      variants: true,
      images: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ products });
}

export async function POST(request: NextRequest) {
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  const body = (await request.json()) as Record<string, unknown>;
  const validation = validateProductInput(body);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.errors[0], errors: validation.errors },
      { status: 400 }
    );
  }

  const categoryId = String(body.categoryId ?? "").trim();
  if (!categoryId) {
    return NextResponse.json({ error: "Selecione a categoria principal." }, { status: 400 });
  }

  const categoryIds = normalizeCategoryIds(categoryId, body.categoryIds);
  const validCategories = await prisma.category.findMany({
    where: { id: { in: categoryIds }, active: true },
    select: { id: true },
  });
  if (validCategories.length !== categoryIds.length) {
    return NextResponse.json(
      { error: "Uma ou mais categorias selecionadas são inválidas ou estão inativas." },
      { status: 400 }
    );
  }

  const subcategoryId =
    typeof body.subcategoryId === "string" && body.subcategoryId
      ? body.subcategoryId
      : null;
  if (subcategoryId) {
    const subcategory = await prisma.subcategory.findFirst({
      where: { id: subcategoryId, categoryId, active: true },
      select: { id: true },
    });
    if (!subcategory) {
      return NextResponse.json(
        { error: "A subcategoria selecionada não pertence à categoria principal." },
        { status: 400 }
      );
    }
  }

  const { data } = validation;
  const variants = Array.isArray(body.variants)
    ? body.variants
        .map((variant) => {
          if (!variant || typeof variant !== "object") return null;
          const raw = variant as { name?: unknown; stockQty?: unknown };
          const name = typeof raw.name === "string" ? raw.name.trim() : "";
          const stockQty = Number(raw.stockQty ?? 0);
          if (!name || !Number.isInteger(stockQty) || stockQty < 0) return null;
          return { name, stockQty };
        })
        .filter((variant): variant is { name: string; stockQty: number } => Boolean(variant))
    : [];

  const product = await prisma.product.create({
    data: {
      name: data.name,
      brand: data.brand,
      sku: data.sku,
      description: data.description,
      price: data.price,
      promoPrice: data.promoPrice,
      stockQty: data.stockQty,
      featured: !!body.featured,
      isNew: !!body.isNew,
      bestSeller: !!body.bestSeller,
      active: body.active ?? true,
      categoryId,
      subcategoryId,
      categories: {
        create: categoryIds.map((id) => ({ categoryId: id })),
      },
      variants: variants.length ? { create: variants } : undefined,
    },
    include: {
      categories: { include: { category: true } },
    },
  });

  await notifyIndexNow([
    indexNowPaths.product(product.id),
    indexNowPaths.catalog,
    indexNowPaths.sitemap,
    ...product.categories.map(({ category }) => indexNowPaths.category(category.slug)),
  ]);

  return NextResponse.json({ product });
}
