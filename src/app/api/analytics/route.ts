import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  consumeRateLimit,
  getClientIp,
  isTrustedSameSiteRequest,
} from "@/lib/public-api-security";

const ALLOWED_EVENTS = new Set([
  "page_view",
  "navigation_click",
  "category_view",
  "product_view",
  "search",
  "add_to_cart",
  "remove_from_cart",
  "begin_checkout",
  "order_created",
  "order_push_opt_in",
  "whatsapp_click",
  "store_location_click",
]);

function stringField(value: unknown, max = 180) {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean ? clean.slice(0, max) : null;
}

function numberField(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function integerField(value: unknown) {
  const parsed = numberField(value);
  return parsed === null ? null : Math.max(0, Math.trunc(parsed));
}

function rateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Muitas solicitações." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

export async function POST(request: NextRequest) {
  if (!isTrustedSameSiteRequest(request)) {
    return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 32 * 1024) {
    return NextResponse.json({ error: "Payload muito grande." }, { status: 413 });
  }

  const clientIp = getClientIp(request);
  const ipLimit = await consumeRateLimit({
    bucket: "analytics_ip_5m",
    key: clientIp,
    limit: 240,
    windowSeconds: 5 * 60,
  });
  if (!ipLimit.allowed) return rateLimited(ipLimit.retryAfterSeconds);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const event = stringField(body.event, 40);
  const sessionId = stringField(body.sessionId, 80);

  if (!event || !ALLOWED_EVENTS.has(event) || !sessionId) {
    return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  }

  const sessionLimit = await consumeRateLimit({
    bucket: "analytics_session_5m",
    key: sessionId,
    limit: 120,
    windowSeconds: 5 * 60,
  });
  if (!sessionLimit.allowed) return rateLimited(sessionLimit.retryAfterSeconds);

  if (event === "begin_checkout") {
    const [checkoutIpLimit, checkoutSessionLimit] = await Promise.all([
      consumeRateLimit({
        bucket: "begin_checkout_ip_1h",
        key: clientIp,
        limit: 30,
        windowSeconds: 60 * 60,
      }),
      consumeRateLimit({
        bucket: "begin_checkout_session_1h",
        key: sessionId,
        limit: 8,
        windowSeconds: 60 * 60,
      }),
    ]);

    if (!checkoutIpLimit.allowed) return rateLimited(checkoutIpLimit.retryAfterSeconds);
    if (!checkoutSessionLimit.allowed) return rateLimited(checkoutSessionLimit.retryAfterSeconds);
  }

  const value = numberField(body.value);
  const eventItemCount =
    event === "search"
      ? integerField(body.resultCount ?? body.itemCount)
      : integerField(body.itemCount);

  await prisma.analyticsEvent.create({
    data: {
      event,
      sessionId,
      productId: stringField(body.productId, 80),
      variantId: stringField(body.variantId, 80),
      categorySlug: stringField(body.categorySlug, 100),
      query: stringField(body.query, 120),
      context: stringField(body.context, 100),
      value: value !== null && value >= 0 && value <= 99999999 ? value : null,
      quantity: integerField(body.quantity),
      itemCount: eventItemCount,
      pagePath: stringField(body.pagePath, 240),
      origin: stringField(body.origin, 100),
      landingPage: stringField(body.landingPage, 240),
      utmSource: stringField(body.utmSource, 120),
      utmMedium: stringField(body.utmMedium, 120),
      utmCampaign: stringField(body.utmCampaign, 180),
      utmContent: stringField(body.utmContent, 180),
    },
  });

  return new NextResponse(null, { status: 204 });
}
