import { NextResponse } from "next/server";
import { getGeminiModel, isGeminiConfigured } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.json({
    configured: isGeminiConfigured(),
    model: getGeminiModel(),
  });
}
