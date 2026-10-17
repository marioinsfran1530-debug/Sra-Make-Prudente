import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { validateEntryFields } from "@/lib/finance";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, error, status } = await requireAdmin("EDITOR");
  if (error || !session) return NextResponse.json({ error }, { status });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const fields = validateEntryFields(body);
  if ("error" in fields) return NextResponse.json({ error: fields.error }, { status: 400 });

  const updated = await prisma.$executeRaw`
    UPDATE app_security."FinanceEntry"
    SET "label" = ${fields.label}, "amount" = ${fields.amount}
    WHERE "id" = ${id}
  `;
  if (updated === 0) {
    return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ entry: { id, ...fields } });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, error, status } = await requireAdmin("EDITOR");
  if (error || !session) return NextResponse.json({ error }, { status });

  const deleted = await prisma.$executeRaw`
    DELETE FROM app_security."FinanceEntry" WHERE "id" = ${id}
  `;
  if (deleted === 0) {
    return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
