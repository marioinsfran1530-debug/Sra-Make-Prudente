import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { markAiSuggestionUsed } from "@/lib/ai-metrics";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAdmin("EDITOR");
  if (auth.error || !auth.session) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const productId =
    typeof body.productId === "string" && body.productId.trim()
      ? body.productId.trim().slice(0, 80)
      : null;
  const selectedIndex =
    typeof body.selectedIndex === "number" && Number.isInteger(body.selectedIndex)
      ? body.selectedIndex
      : null;

  await markAiSuggestionUsed({
    suggestionId: id,
    adminId: auth.session.id,
    productId,
    edited: body.edited === true,
    selectedIndex,
  });

  return NextResponse.json({ ok: true });
}
