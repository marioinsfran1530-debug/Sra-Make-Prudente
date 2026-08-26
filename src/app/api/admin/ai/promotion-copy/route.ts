import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAiGeneration } from "@/lib/ai-metrics";
import {
  GeminiError,
  generatePromotionCopy,
  type PromotionCopyInput,
} from "@/lib/gemini";
import { prisma } from "@/lib/prisma";

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function campaignReason(product: {
  price: { toString(): string };
  promoPrice: { toString(): string } | null;
  bestSeller: boolean;
  isNew: boolean;
  featured: boolean;
}): PromotionCopyInput["campaignReason"] {
  const price = Number(product.price.toString());
  const promoPrice = product.promoPrice ? Number(product.promoPrice.toString()) : null;

  if (promoPrice !== null && promoPrice < price) return "oferta";
  if (product.bestSeller) return "mais_vendido";
  if (product.isNew) return "novidade";
  if (product.featured) return "destaque";
  return "catalogo";
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin("EDITOR");
  if (auth.error || !auth.session) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const productId = text(body.productId, 80);
  if (!productId) {
    return NextResponse.json({ error: "Produto não informado." }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      brand: true,
      price: true,
      promoPrice: true,
      bestSeller: true,
      isNew: true,
      featured: true,
      category: { select: { name: true } },
    },
  });
  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  }

  const reason = campaignReason(product);

  try {
    const generated = await generatePromotionCopy({
      name: product.name,
      brand: product.brand,
      category: product.category.name,
      campaignReason: reason,
    });

    const metric = await recordAiGeneration({
      feature: "promotion_copy",
      adminId: auth.session.id,
      productId: product.id,
      model: generated.model,
      promptVersion: generated.promptVersion,
      suggestionCount: generated.variations.length,
    });

    return NextResponse.json({
      variations: generated.variations,
      suggestionId: metric?.id ?? null,
      model: generated.model,
      promptVersion: generated.promptVersion,
      reason,
    });
  } catch (error) {
    if (error instanceof GeminiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error("Falha inesperada na geração de copy:", error);
    return NextResponse.json(
      { error: "Não foi possível gerar variações agora." },
      { status: 500 }
    );
  }
}
