import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

type VariantInput = {
  id?: string;
  name: string;
  stockQty: number;
};

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  const body = await request.json();

  const variants: VariantInput[] = Array.isArray(body.variants)
    ? body.variants
        .map((variant: VariantInput) => ({
          id: variant.id,
          name: String(variant.name ?? "").trim(),
          stockQty: Number(variant.stockQty ?? 0),
        }))
        .filter((variant: VariantInput) => variant.name.length > 0)
    : [];

  const product = await prisma.$transaction(async (tx) => {
    const updatedProduct = await tx.product.update({
      where: { id: params.id },
      data: {
        name: body.name,
        brand: body.brand,
        sku: body.sku || null,
        description: body.description || null,
        price: Number(body.price),
        promoPrice:
          body.promoPrice === null ||
          body.promoPrice === undefined ||
          body.promoPrice === ""
            ? null
            : Number(body.promoPrice),
        stockQty: Number(body.stockQty ?? 0),
        featured: !!body.featured,
        isNew: !!body.isNew,
        bestSeller: !!body.bestSeller,
        active: body.active ?? true,
        categoryId: body.categoryId,
        subcategoryId: body.subcategoryId || null,
      },
    });

    const receivedIds = variants
      .map((variant) => variant.id)
      .filter((id): id is string => Boolean(id));

    await tx.productVariant.deleteMany({
      where: {
        productId: params.id,
        ...(receivedIds.length > 0
          ? {
              id: {
                notIn: receivedIds,
              },
            }
          : {}),
      },
    });

    for (const variant of variants) {
      if (variant.id) {
        await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            name: variant.name,
            stockQty: variant.stockQty,
          },
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
