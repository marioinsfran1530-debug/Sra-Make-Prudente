import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_EVENTS = new Set([
  "page_view",
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

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  }

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

  const value = numberField(body.value);

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
      itemCount: integerField(body.itemCount),
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
