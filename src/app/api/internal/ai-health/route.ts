import { NextResponse } from "next/server";
import {
  generateProductDescription,
  getGeminiModel,
  isGeminiConfigured,
} from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const result = await generateProductDescription({
      name: "Produto Teste",
      brand: "Sra Make",
      category: "Maquiagem",
      subcategory: null,
    });

    return NextResponse.json({
      configured: isGeminiConfigured(),
      model: getGeminiModel(),
      reachable: true,
      generated: result.description.length >= 30,
      promptVersion: result.promptVersion,
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: isGeminiConfigured(),
        model: getGeminiModel(),
        reachable: false,
        error: error instanceof Error ? error.message : "Falha desconhecida",
      },
      { status: 502 }
    );
  }
}
