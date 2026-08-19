import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

type VariantInput = {
  id?: string;
  name: string;
  stockQty: number;
};

function normalizeCategoryIds(primaryCategoryId: string, categoryIds: unknown) {
  const ids = Array.isArray(categoryIds)
    ? categoryIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];

  return Array.from(new Set([primaryCategoryId, ...ids]));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  const body = await request.json();
  const variantsProvided = Array.isArray(body.variants);
  const categoriesProvided = Array.isArray(body.categoryIds) || body.categoryId !== undefined;

  const variants: VariantInput[] = variantsProvided
    ? body.variants
        .map((variant: VariantInput) => ({
          id: variant.id,
          name: String(variant.name ?? "").trim(),
          stockQty: Number(variant.stockQty ?? 0),
        }))
        .filter((variant: VariantInput) => variant.name.length > 0)
    : [];

  const product = await prisma.$transaction(async (tx) => {
    const current = await tx.product.findUnique({
      where: { id: params.id },
      select: { categoryId: true },
    });

    if (!current) throw new Error("Produto não encontrado.");

    const primaryCategoryId = String(body.categoryId ?? current.categoryId);

    const updatedProduct = await tx.product.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.brand !== undefined && { brand: body.brand }),
        ...(body.sku !== undefined && { sku: body.sku || null }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.price !== undefined && { price: Number(body.price) }),
        ...(body.promoPrice !== undefined && {
          promoPrice:
            body.promoPrice === null || body.promoPrice === ""
              ? null
              : Number(body.promoPrice),
        }),
        ...(body.stockQty !== undefined && { stockQty: Number(body.stockQty) }),
        ...(body.featured !== undefined && { featured: !!body.featured }),
        ...(body.isNew !== undefined && { isNew: !!body.isNew }),
        ...(body.bestSeller !== undefined && { bestSeller: !!body.bestSeller }),
        ...(body.active !== undefined && { active: !!body.active }),
        ...(body.categoryId !== undefined && { categoryId: primaryCategoryId }),
        ...(body.subcategoryId !== undefined && { subcategoryId: body.subcategoryId || null }),
      },
    });

    if (categoriesProvided) {
      const categoryIds = normalizeCategoryIds(primaryCategoryId, body.categoryIds);
      await tx.productCategory.deleteMany({ where: { productId: params.id } });
      await tx.productCategory.createMany({
        data: categoryIds.map((categoryId) => ({ productId: params.id, categoryId })),
        skipDuplicates: true,
      });
    }

    if (variantsProvided) {
      const receivedIds = variants
        .map((variant) => variant.id)
        .filter((id): id is string => Boolean(id));

      await tx.productVariant.deleteMany({
        where: {
          productId: params.id,
          ...(receivedIds.length > 0 ? { id: { notIn: receivedIds } } : {}),
        },
      });

      for (const variant of variants) {
        if (variant.id) {
          await tx.productVariant.update({
            where: { id: variant.id, productId: params.id },
            data: { name: variant.name, stockQty: variant.stockQty },
          });
        } else {
          await tx.productVariant.create({
            data: {
              productId: params.id,
              name: variant.name,
              stockQty: variant.stockQty,
            },
          });
        }
      }
    }

    return updatedProduct;
  });

  return NextResponse.json({ product });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  await prisma.product.update({
    where: { id: params.id },
    data: { active: false },
  });

  return NextResponse.json({ ok: true });
}
