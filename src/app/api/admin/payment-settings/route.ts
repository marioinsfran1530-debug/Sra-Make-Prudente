import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { normalizePaymentSettings } from "@/lib/payment-settings";

export const dynamic = "force-dynamic";

type PaymentSettingsRow = { config: unknown };

async function readSettings() {
  const rows = await prisma.$queryRaw<PaymentSettingsRow[]>`
    SELECT "config"
    FROM app_security."PaymentSettings"
    WHERE "id" = 'default'
    LIMIT 1
  `;
  return normalizePaymentSettings(rows[0]?.config);
}

export async function GET() {
  const { session, error, status } = await requireAdmin("EDITOR");
  if (error || !session) return NextResponse.json({ error }, { status });
  return NextResponse.json({ settings: await readSettings() });
}

export async function PUT(request: NextRequest) {
  const { session, error, status } = await requireAdmin("ADMIN");
  if (error || !session) return NextResponse.json({ error }, { status });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Configuração de pagamento inválida." }, { status: 400 });
  }

  const settings = normalizePaymentSettings(payload);
  const ids = new Set<string>();
  for (const provider of settings.providers) {
    if (ids.has(provider.id)) {
      return NextResponse.json({ error: "Há operadoras com identificadores duplicados." }, { status: 400 });
    }
    ids.add(provider.id);
  }

  const json = JSON.stringify(settings);
  await prisma.$executeRaw`
    INSERT INTO app_security."PaymentSettings" ("id", "config", "updatedAt")
    VALUES ('default', ${json}::jsonb, NOW())
    ON CONFLICT ("id") DO UPDATE
    SET "config" = EXCLUDED."config", "updatedAt" = NOW()
  `;

  return NextResponse.json({ settings });
}
