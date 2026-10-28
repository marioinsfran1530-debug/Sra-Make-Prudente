import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { isValidMonth, validateGoalFields } from "@/lib/finance";
import { saveFinanceGoal } from "@/lib/finance-data";

export const dynamic = "force-dynamic";

// Salva o lucro desejado e a meta de vendas digitada de um mês.
// goalOverride = null volta a usar a meta sugerida pelo painel.
export async function PUT(request: NextRequest) {
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

  const fields = validateGoalFields(body);
  if ("error" in fields) return NextResponse.json({ error: fields.error }, { status: 400 });

  await saveFinanceGoal(month, fields.desiredProfit, fields.goalOverride);

  return NextResponse.json({ goal: { month, ...fields } });
}
