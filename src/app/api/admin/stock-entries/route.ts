import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { todayIso } from "@/lib/finance";
import { parseEntryInput } from "@/lib/stock-entry";
import { createStockEntry, StockEntryError } from "@/lib/stock-entry-data";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { session, error, status } = await requireAdmin("EDITOR");
  if (error || !session) return NextResponse.json({ error }, { status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados da entrada inválidos." }, { status: 400 });
  }

  const parsed = parseEntryInput(body, todayIso());
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const result = await createStockEntry(parsed.value, session.id);
    return NextResponse.json({ id: result.id, duplicate: result.duplicate });
  } catch (err) {
    if (err instanceof StockEntryError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("Erro ao registrar entrada de estoque:", err);
    return NextResponse.json({ error: "Não foi possível registrar a entrada." }, { status: 500 });
  }
}
