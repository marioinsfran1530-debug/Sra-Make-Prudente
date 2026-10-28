import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { isFinanceKind, isValidMonth, validateEntryFields, validatePaymentFields } from "@/lib/finance";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { session, error, status } = await requireAdmin("EDITOR");
  if (error || !session) return NextResponse.json({ error }, { status });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const month = body.month;
  const kind = body.kind;
  if (!isValidMonth(month)) {
    return NextResponse.json({ error: "Mês inválido." }, { status: 400 });
  }
  if (!isFinanceKind(kind)) {
    return NextResponse.json({ error: "Tipo de lançamento inválido." }, { status: 400 });
  }
  const fields = validateEntryFields(body);
  if ("error" in fields) return NextResponse.json({ error: fields.error }, { status: 400 });

  // Sem situação no corpo, o lançamento vale como pago hoje (comportamento anterior).
  const payment = validatePaymentFields(body, { defaultStatus: "PAGO" });
  if ("error" in payment) return NextResponse.json({ error: payment.error }, { status: 400 });

  // ::text::date deixa o tipo do parâmetro explícito, inclusive quando a data é nula.
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO app_security."FinanceEntry" ("month", "kind", "label", "amount", "status", "dueDate", "paidAt")
    VALUES (
      ${month}, ${kind}, ${fields.label}, ${fields.amount}, ${payment.status},
      ${payment.dueDate}::text::date, ${payment.paidAt}::text::date
    )
    RETURNING "id"
  `;

  return NextResponse.json(
    {
      entry: {
        id: rows[0]?.id,
        month,
        kind,
        label: fields.label,
        amount: fields.amount,
        status: payment.status,
        dueDate: payment.dueDate,
        paidAt: payment.paidAt,
      },
    },
    { status: 201 }
  );
}
