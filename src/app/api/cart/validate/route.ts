import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasEnoughStock, orderItemRequiresVariant, orderLineKey } from "@/lib/order-validation";
import { productPath } from "@/lib/product-url";

type CartItemInput = {
  productId: string;
  variantId: string | null;
  qty: number;
};

type CartIssue = {
  type: "PRODUCT_UNAVAILABLE" | "VARIANT_REQUIRED" | "VARIANT_UNAVAILABLE" | "INSUFFICIENT_STOCK" | "INVALID_ITEM";
  productId: string;
  productName: string;
  variantId: string | null;
  message: string;
  productPath?: string;
  options?: Array<{ id: string; name: string; stockQty: number }>;
};

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  let body: { items?: CartItemInput[] };

  try {
    body = (await request.json()) as { items?: CartItemInput[] };
  } catch {
    return NextResponse.json({ valid: false, issues: [] }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ valid: false, issues: [] }, { status: 400 });
  }

  if (body.items.length > 50) {
    return NextResponse.json(
      {
        valid: false,
        issues: [
          {
            type: "INVALID_ITEM",
            productId: "",
            productName: "Carrinho",
            variantId: null,
            message: "Quantidade de itens acima do permitido.",
          },
        ] satisfies CartIssue[],
      },
      { status: 400 }
    );
  }

  const productIds = [...new Set(body.items.map((item) => text(item?.productId, 100)).filter(Boolean))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { variants: true },
  });
  const productById = new Map(products.map((product) => [product.id, product]));
  const requestedByLine = new Map<string, number>();
  const issues: CartIssue[] = [];

  for (const item of body.items) {
    const productId = text(item?.productId, 100);
    const variantId = item?.variantId ? text(item.variantId, 100) : null;
    const rawQty = Number(item?.qty);

    if (!productId || !Number.isFinite(rawQty) || Math.floor(rawQty) < 1) {
      issues.push({
        type: "INVALID_ITEM",
        productId,
        productName: "Produto",
        variantId,
        message: "Há um item inválido no carrinho. Remova-o e adicione novamente.",
      });
      continue;
    }

    const qty = Math.floor(rawQty);
    const product = productById.get(productId);

    if (!product || !product.active) {
      issues.push({
        type: "PRODUCT_UNAVAILABLE",
        productId,
        productName: product?.name ?? "Produto",
        variantId,
        message: `${product?.name ?? "Um produto"} não está mais disponível. Remova-o do carrinho para continuar.`,
      });
      continue;
    }

    const activeVariants = product.variants.filter((variant) => variant.active);
    const path = productPath({ name: product.name, brand: product.brand });

    if (orderItemRequiresVariant(activeVariants.length, variantId)) {
      issues.push({
        type: "VARIANT_REQUIRED",
        productId,
        productName: product.name,
        variantId,
        productPath: path,
        options: activeVariants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          stockQty: variant.stockQty,
        })),
        message: `${product.name} agora possui opções. Escolha ${activeVariants.map((variant) => variant.name).join(", ")} para continuar.`,
      });
      continue;
    }

    let availableStock = product.stockQty;
    let variantName: string | null = null;

    if (variantId) {
      const variant = activeVariants.find((candidate) => candidate.id === variantId);
      if (!variant) {
        issues.push({
          type: "VARIANT_UNAVAILABLE",
          productId,
          productName: product.name,
          variantId,
          productPath: path,
          options: activeVariants.map((candidate) => ({
            id: candidate.id,
            name: candidate.name,
            stockQty: candidate.stockQty,
          })),
          message: `A opção escolhida de ${product.name} não está mais disponível. Escolha outra opção para continuar.`,
        });
        continue;
      }
      availableStock = variant.stockQty;
      variantName = variant.name;
    }

    const lineKey = orderLineKey(product.id, variantId);
    const requestedQty = (requestedByLine.get(lineKey) ?? 0) + qty;
    requestedByLine.set(lineKey, requestedQty);

    if (!hasEnoughStock(availableStock, requestedQty)) {
      issues.push({
        type: "INSUFFICIENT_STOCK",
        productId,
        productName: product.name,
        variantId,
        productPath: path,
        message: `A quantidade de ${product.name}${variantName ? ` (${variantName})` : ""} mudou. Disponível: ${availableStock}. Ajuste a quantidade para continuar.`,
      });
    }
  }

  return NextResponse.json({ valid: issues.length === 0, issues });
}
