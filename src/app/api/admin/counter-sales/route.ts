import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { CounterSaleError, createCounterSale } from "@/lib/counter-sale";

type Body = {
  items?: Array<{ productId?: string; variantId?: string | null; qty?: number }>;
  payments?: Array<{ method?: "PIX" | "DINHEIRO" | "DEBITO" | "CREDITO"; amount?: number }>;
  discount?: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
};

export async function POST(request: NextRequest) {
  const { session, error, status } = await requireAdmin("EDITOR");
  if (error || !session) return NextResponse.json({ error }, { status });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Dados da venda inválidos." }, { status: 400 });
  }

  try {
    const order = await createCounterSale({
      items: (body.items ?? []).map((item) => ({
        productId: typeof item.productId === "string" ? item.productId : "",
        variantId: typeof item.variantId === "string" ? item.variantId : null,
        qty: Number(item.qty ?? 0),
      })),
      payments: (body.payments ?? []).map((payment) => ({
        method: payment.method ?? "PIX",
        amount: Number(payment.amount ?? 0),
      })),
      discount: Number(body.discount ?? 0),
      customerName: typeof body.customerName === "string" ? body.customerName : "",
      customerPhone: typeof body.customerPhone === "string" ? body.customerPhone : "",
      notes: typeof body.notes === "string" ? body.notes : "",
      createdById: session.id,
    });

    return NextResponse.json({
      order: {
        id: order.id,
        number: order.number,
        total: Number(order.total),
        customerName: order.customerName,
      },
    });
  } catch (err) {
    if (err instanceof CounterSaleError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("Erro ao registrar venda no balcão:", err);
    return NextResponse.json({ error: "Não foi possível finalizar a venda." }, { status: 500 });
  }
}
