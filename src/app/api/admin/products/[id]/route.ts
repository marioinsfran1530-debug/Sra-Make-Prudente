import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { indexNowPaths, notifyIndexNow } from "@/lib/indexnow";
import { validateProductInput } from "@/lib/product-input";

type VariantInput = {
  id?: string;
  name: string;
  stockQty: number;
};

const PRODUCT_IMAGES_BUCKET = "product-images";
const OPEN_ORDER_STATUSES = [
  "NOVO",
  "EM_CONFIRMACAO",
  "CONFIRMADO",
  "SEPARANDO",
  "PRONTO_RETIRADA",
  "SAIU_ENTREGA",
] as const;

function normalizeCategoryIds(primaryCategoryId: string, categoryIds: unknown) {
  const ids = Array.isArray(categoryIds)
    ? categoryIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  return Array.from(new Set([primaryCategoryId, ...ids]));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  const body = (await request.json()) as Record<string, unknown>;
  const current = await prisma.product.findUnique({
    where: { id },
    select: {
      name: true,
      brand: true,
      sku: true,
      description: true,
      price: true,
      promoPrice: true,
      stockQty: true,
      categoryId: true,
    },
  });
  if (!current) {
    return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  }

  const mergedInput: Record<string, unknown> = {
    name: body.name ?? current.name,
    brand: body.brand ?? current.brand,
    sku: body.sku !== undefined ? body.sku : current.sku,
    description: body.description !== undefined ? body.description : current.description,
    price: body.price ?? Number(current.price),
    promoPrice: body.promoPrice !== undefined ? body.promoPrice : current.promoPrice ? Number(current.promoPrice) : null,
    stockQty: body.stockQty ?? current.stockQty,
  };
  const validation = validateProductInput(mergedInput);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.errors[0], errors: validation.errors },
      { status: 400 }
    );
  }

  const variantsProvided = Array.isArray(body.variants);
  const categoriesProvided = Array.isArray(body.categoryIds) || body.categoryId !== undefined;
  const variants: VariantInput[] = [];

  if (variantsProvided) {
    for (const rawVariant of body.variants as unknown[]) {
      if (!rawVariant || typeof rawVariant !== "object") continue;
      const raw = rawVariant as { id?: unknown; name?: unknown; stockQty?: unknown };
      const name = typeof raw.name === "string" ? raw.name.trim() : "";
      const stockQty = Number(raw.stockQty ?? 0);
      if (!name) continue;
      if (!Number.isInteger(stockQty) || stockQty < 0) {
        return NextResponse.json(
          { error: `Estoque inválido na variante "${name}".` },
          { status: 400 }
        );
      }
      variants.push({
        id: typeof raw.id === "string" ? raw.id : undefined,
        name,
        stockQty,
      });
    }
  }

  const primaryCategoryId = String(body.categoryId ?? current.categoryId).trim();
  if (!primaryCategoryId) {
    return NextResponse.json({ error: "Selecione a categoria principal." }, { status: 400 });
  }

  let categoryIds: string[] | null = null;
  if (categoriesProvided) {
    categoryIds = normalizeCategoryIds(primaryCategoryId, body.categoryIds);
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
  }

  const subcategoryId =
    body.subcategoryId !== undefined
      ? typeof body.subcategoryId === "string" && body.subcategoryId
        ? body.subcategoryId
        : null
      : undefined;
  if (subcategoryId) {
    const subcategory = await prisma.subcategory.findFirst({
      where: { id: subcategoryId, categoryId: primaryCategoryId, active: true },
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
  const product = await prisma.$transaction(async (tx) => {
    const updatedProduct = await tx.product.update({
      where: { id },
      data: {
        name: data.name,
        brand: data.brand,
        sku: data.sku,
        description: data.description,
        price: data.price,
        promoPrice: data.promoPrice,
        stockQty: data.stockQty,
        ...(body.featured !== undefined && { featured: !!body.featured }),
        ...(body.isNew !== undefined && { isNew: !!body.isNew }),
        ...(body.bestSeller !== undefined && { bestSeller: !!body.bestSeller }),
        ...(body.active !== undefined && { active: !!body.active }),
        ...(body.categoryId !== undefined && { categoryId: primaryCategoryId }),
        ...(body.subcategoryId !== undefined && { subcategoryId: subcategoryId ?? null }),
      },
    });

    if (categoryIds) {
      await tx.productCategory.deleteMany({ where: { productId: id } });
      await tx.productCategory.createMany({
        data: categoryIds.map((categoryId) => ({ productId: id, categoryId })),
        skipDuplicates: true,
      });
    }

    if (variantsProvided) {
      const receivedIds = variants
        .map((variant) => variant.id)
        .filter((variantId): variantId is string => Boolean(variantId));

      await tx.productVariant.deleteMany({
        where: {
          productId: id,
          ...(receivedIds.length > 0 ? { id: { notIn: receivedIds } } : {}),
        },
      });

      for (const variant of variants) {
        if (variant.id) {
          await tx.productVariant.update({
            where: { id: variant.id, productId: id },
            data: { name: variant.name, stockQty: variant.stockQty },
          });
        } else {
          await tx.productVariant.create({
            data: { productId: id, name: variant.name, stockQty: variant.stockQty },
          });
        }
      }
    }

    return updatedProduct;
  });

  await notifyIndexNow([
    indexNowPaths.product(product.id),
    indexNowPaths.catalog,
    indexNowPaths.sitemap,
  ]);

  return NextResponse.json({ product });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, images: { select: { storagePath: true } } },
  });

  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  }

  const orderInProgress = await prisma.orderItem.findFirst({
    where: {
      productId: id,
      order: { status: { in: [...OPEN_ORDER_STATUSES] } },
    },
    select: { id: true },
  });

  if (orderInProgress) {
    return NextResponse.json(
      { error: "Este produto está ligado a um pedido em andamento. Finalize ou cancele o pedido antes de excluir." },
      { status: 409 }
    );
  }

  await prisma.product.delete({ where: { id } });

  const storagePaths = product.images
    .map((image) => image.storagePath)
    .filter((path): path is string => Boolean(path));

  if (storagePaths.length > 0 && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error: storageError } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove(storagePaths);

    if (storageError) {
      console.error("Produto excluído, mas houve falha ao limpar imagens:", storageError);
    }
  }

  await notifyIndexNow([
    indexNowPaths.product(id),
    indexNowPaths.catalog,
    indexNowPaths.sitemap,
  ]);

  return NextResponse.json({ ok: true });
}
