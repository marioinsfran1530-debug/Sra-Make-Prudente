import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { indexNowPaths, notifyIndexNow } from "@/lib/indexnow";

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

  const body = await request.json();
  const categoryId = String(body.categoryId ?? "");

  if (!categoryId) {
    return NextResponse.json({ error: "Selecione a categoria principal." }, { status: 400 });
  }

  const categoryIds = normalizeCategoryIds(categoryId, body.categoryIds);

  const product = await prisma.product.create({
    data: {
      name: body.name,
      brand: body.brand,
      sku: body.sku || null,
      description: body.description || null,
      price: body.price,
      promoPrice: body.promoPrice || null,
      stockQty: body.stockQty ?? 0,
      featured: !!body.featured,
      isNew: !!body.isNew,
      bestSeller: !!body.bestSeller,
      active: body.active ?? true,
      categoryId,
      subcategoryId: body.subcategoryId || null,
      categories: {
        create: categoryIds.map((id) => ({ categoryId: id })),
      },
      variants: body.variants?.length
        ? {
            create: body.variants.map((v: { name: string; stockQty: number }) => ({
              name: v.name,
              stockQty: v.stockQty ?? 0,
            })),
          }
        : undefined,
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
