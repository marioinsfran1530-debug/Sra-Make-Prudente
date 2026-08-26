import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAiGeneration } from "@/lib/ai-metrics";
import { classifyAiCampaignReason } from "@/lib/ai-rules";
import { GeminiError, generatePromotionCopy } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
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
      description: true,
      price: true,
      promoPrice: true,
      bestSeller: true,
      isNew: true,
      featured: true,
      category: { select: { name: true } },
      subcategory: { select: { name: true } },
    },
  });
  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  }

  // Verdades comerciais continuam decididas pelo sistema, nunca pela IA.
  const reason = classifyAiCampaignReason(product);

  try {
    const generated = await generatePromotionCopy({
      name: product.name,
      brand: product.brand,
      category: product.category.name,
      subcategory: product.subcategory?.name ?? null,
      description: product.description,
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
