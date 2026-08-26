import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAiGeneration } from "@/lib/ai-metrics";
import {
  GeminiError,
  generateProductDescription,
} from "@/lib/gemini";
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
  const name = text(body.name, 180);
  const brand = text(body.brand, 120);
  const categoryId = text(body.categoryId, 80);
  const subcategoryId = text(body.subcategoryId, 80);
  const productId = text(body.productId, 80) || null;

  if (!name || !brand || !categoryId) {
    return NextResponse.json(
      { error: "Preencha nome, marca e categoria antes de gerar a descrição." },
      { status: 400 }
    );
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, active: true },
    select: { id: true, name: true },
  });
  if (!category) {
    return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });
  }

  let subcategoryName: string | null = null;
  if (subcategoryId) {
    const subcategory = await prisma.subcategory.findFirst({
      where: { id: subcategoryId, categoryId: category.id, active: true },
      select: { name: true },
    });
    if (!subcategory) {
      return NextResponse.json(
        { error: "A subcategoria selecionada não pertence à categoria principal." },
        { status: 400 }
      );
    }
    subcategoryName = subcategory.name;
  }

  try {
    const generated = await generateProductDescription({
      name,
      brand,
      category: category.name,
      subcategory: subcategoryName,
    });

    const metric = await recordAiGeneration({
      feature: "product_description",
      adminId: auth.session.id,
      productId,
      model: generated.model,
      promptVersion: generated.promptVersion,
      suggestionCount: 1,
    });

    return NextResponse.json({
      description: generated.description,
      suggestionId: metric?.id ?? null,
      model: generated.model,
      promptVersion: generated.promptVersion,
    });
  } catch (error) {
    if (error instanceof GeminiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error("Falha inesperada na geração de descrição:", error);
    return NextResponse.json(
      { error: "Não foi possível gerar a descrição agora." },
      { status: 500 }
    );
  }
}
