import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  captureCheckoutOpportunity,
  type CheckoutRecoveryPhase,
} from "@/lib/checkout-recovery";
import { normalizeBrazilPhone } from "@/lib/order-request-safety";
import {
  consumeRateLimit,
  getClientIp,
  isTrustedSameSiteRequest,
} from "@/lib/public-api-security";

type RecoveryBody = {
  customerName?: string;
  customerPhone?: string;
  sessionId?: string;
  items?: Array<{
    productId?: string;
    variantId?: string | null;
    qty?: number;
  }>;
  deliveryType?: string;
  payment?: string;
  phase?: CheckoutRecoveryPhase;
};

const ALLOWED_PHASES = new Set<CheckoutRecoveryPhase>([
  "CONTACT",
  "REVIEW",
  "SUBMIT_ATTEMPT",
]);

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function rateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { ok: false },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

export async function POST(request: NextRequest) {
  if (!isTrustedSameSiteRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 48 * 1024) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  const clientIp = getClientIp(request);
  const ipLimit = await consumeRateLimit({
    bucket: "checkout_recovery_ip_10m",
    key: clientIp,
    limit: 20,
    windowSeconds: 10 * 60,
  });
  if (!ipLimit.allowed) return rateLimited(ipLimit.retryAfterSeconds);

  let body: RecoveryBody;
  try {
    body = (await request.json()) as RecoveryBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const customerName = text(body.customerName, 120);
  const normalizedPhone = normalizeBrazilPhone(text(body.customerPhone, 30));
  const sessionId = text(body.sessionId, 200);
  const phase = ALLOWED_PHASES.has(body.phase as CheckoutRecoveryPhase)
    ? (body.phase as CheckoutRecoveryPhase)
    : "CONTACT";

  if (!customerName || customerName.length < 2 || !normalizedPhone || !sessionId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const [sessionLimit, phoneLimit] = await Promise.all([
    consumeRateLimit({
      bucket: "checkout_recovery_session_1h",
      key: sessionId,
      limit: 10,
      windowSeconds: 60 * 60,
    }),
    consumeRateLimit({
      bucket: "checkout_recovery_phone_1h",
      key: normalizedPhone,
      limit: 8,
      windowSeconds: 60 * 60,
    }),
  ]);

  if (!sessionLimit.allowed) return rateLimited(sessionLimit.retryAfterSeconds);
  if (!phoneLimit.allowed) return rateLimited(phoneLimit.retryAfterSeconds);

  const recentCheckoutActivity = await prisma.analyticsEvent.findFirst({
    where: {
      sessionId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      OR: [
        { event: "begin_checkout" },
        { event: "page_view", pagePath: "/checkout" },
      ],
    },
    select: { id: true },
  });

  if (!recentCheckoutActivity) {
    return NextResponse.json({ ok: false }, { status: 409 });
  }

  const items = body.items.map((item) => ({
    productId: text(item.productId, 100),
    variantId: item.variantId ? text(item.variantId, 100) : null,
    qty: Math.max(1, Math.min(99, Math.floor(Number(item.qty) || 1))),
  }));

  if (items.some((item) => !item.productId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const recovery = await captureCheckoutOpportunity({
    customerName,
    customerPhone: normalizedPhone,
    sessionId,
    items,
    deliveryType: text(body.deliveryType, 30) || undefined,
    payment: text(body.payment, 40) || undefined,
    phase,
  });

  return NextResponse.json({ ok: Boolean(recovery) });
}
