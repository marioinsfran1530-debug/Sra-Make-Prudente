import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_FIXED_EXPENSES, isValidMonth, shiftMonth } from "@/lib/finance";

export const dynamic = "force-dynamic";

// Carrega as despesas de um mês vazio: da planilha de precificação da loja
// ("default") ou copiando as fixas e a retirada do mês anterior ("previous").
// Cada opção é uma única instrução SQL com NOT EXISTS, então dois cliques
// seguidos (ou dois aparelhos) nunca duplicam as despesas.
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
  if (!isValidMonth(month)) {
    return NextResponse.json({ error: "Mês inválido." }, { status: 400 });
  }

  if (body.source === "previous") {
    const previous = shiftMonth(month, -1);
    const inserted = await prisma.$executeRaw`
      INSERT INTO app_security."FinanceEntry" ("month", "kind", "label", "amount")
      SELECT ${month}, "kind", "label", "amount"
      FROM app_security."FinanceEntry"
      WHERE "month" = ${previous}
        AND "kind" IN ('FIXA', 'RETIRADA')
        AND NOT EXISTS (
          SELECT 1 FROM app_security."FinanceEntry"
          WHERE "month" = ${month} AND "kind" IN ('FIXA', 'RETIRADA')
        )
    `;
    if (inserted === 0) {
      return NextResponse.json(
        { error: "Não há despesas fixas no mês anterior para copiar, ou este mês já tem despesas." },
        { status: 409 }
      );
    }
    return NextResponse.json({ inserted });
  }

  if (body.source === "default") {
    const labels = DEFAULT_FIXED_EXPENSES.map((item) => item.label);
    const amounts = DEFAULT_FIXED_EXPENSES.map((item) => item.amount.toFixed(2));
    const inserted = await prisma.$executeRaw`
      INSERT INTO app_security."FinanceEntry" ("month", "kind", "label", "amount")
      SELECT ${month}, 'FIXA', t."label", t."amount"::numeric
      FROM unnest(${labels}::text[], ${amounts}::text[]) AS t("label", "amount")
      WHERE NOT EXISTS (
        SELECT 1 FROM app_security."FinanceEntry"
        WHERE "month" = ${month} AND "kind" = 'FIXA'
      )
    `;
    if (inserted === 0) {
      return NextResponse.json({ error: "Este mês já tem despesas fixas." }, { status: 409 });
    }
    return NextResponse.json({ inserted });
  }

  return NextResponse.json({ error: "Origem inválida." }, { status: 400 });
}
