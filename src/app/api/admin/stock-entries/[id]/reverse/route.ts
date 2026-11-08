import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { reverseStockEntry, StockEntryError } from "@/lib/stock-entry-data";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error, status } = await requireAdmin("EDITOR");
  if (error || !session) return NextResponse.json({ error }, { status });

  const { id } = await params;
  if (!id || id.length > 80) return NextResponse.json({ error: "Entrada inválida." }, { status: 400 });

  let note = "";
  try {
    const body = (await request.json()) as { note?: unknown };
    note = typeof body.note === "string" ? body.note : "";
  } catch {
    // Motivo é opcional.
  }

  try {
    const result = await reverseStockEntry(id, session.id, note);
    return NextResponse.json({ id: result.id, alreadyReversed: result.alreadyReversed });
  } catch (err) {
    if (err instanceof StockEntryError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("Erro ao estornar entrada de estoque:", err);
    return NextResponse.json({ error: "Não foi possível estornar a entrada." }, { status: 500 });
  }
}
