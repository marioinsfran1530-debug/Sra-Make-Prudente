import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productPath } from "@/lib/product-url";

type RouteProduct = { id: string; name: string; brand: string };

const ROUTE_SKIP = new Set(["a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "com", "para", "por", "kit", "combo", "produto"]);

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function routeWords(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !ROUTE_SKIP.has(word));
}

function routeKey(product: RouteProduct, catalog: RouteProduct[]) {
  const words = routeWords(product.name);
  const max = Math.min(4, words.length);

  for (let count = 1; count <= max; count += 1) {
    const candidate = words.slice(0, count).join("-");
    const same = catalog.filter(
      (item) => routeWords(item.name).slice(0, count).join("-") === candidate
    );
    if (same.length === 1) return candidate;
  }

  const base = words.slice(0, Math.max(1, max)).join("-") || "produto";
  return `${base}-${product.id.slice(-4)}`;
}

function campaignKind(value: string | null) {
  if (value === "o") return "oferta";
  if (value === "n") return "novidade";
  return "destaque";
}

function campaignContent(value: string | null) {
  return value === "q" ? "quadrado" : "status";
}

function campaignSource(value: string | null) {
  if (value === "w") return "whatsapp";
  if (value === "i") return "instagram";
  return "social";
}

function campaignDate(value: string | null) {
  return /^\d{8}$/.test(value || "")
    ? value!
    : new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!/^[a-z0-9-]{2,80}$/i.test(code)) {
    return NextResponse.redirect(new URL("/loja", request.url), 302);
  }

  const products = await prisma.product.findMany({
    where: { active: true },
    select: { id: true, name: true, brand: true },
  });

  const product =
    products.find((item) => routeKey(item, products) === code) ??
    products.find((item) => item.id.endsWith(code));

  if (!product) {
    return NextResponse.redirect(new URL("/loja", request.url), 302);
  }

  const kind = campaignKind(request.nextUrl.searchParams.get("k"));
  const content = campaignContent(request.nextUrl.searchParams.get("f"));
  const source = campaignSource(request.nextUrl.searchParams.get("s"));
  const date = campaignDate(request.nextUrl.searchParams.get("d"));
  const campaign = `${kind}-${slug(product.name)}-${date}`;

  try {
    await prisma.campaignLinkMetric.upsert({
      where: {
        code_utmCampaign_utmContent: {
          code,
          utmCampaign: campaign,
          utmContent: content,
        },
      },
      create: {
        code,
        productId: product.id,
        utmSource: source,
        utmMedium: "organic",
        utmCampaign: campaign,
        utmContent: content,
        clicks: 1,
        lastClickedAt: new Date(),
      },
      update: {
        clicks: { increment: 1 },
        lastClickedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Falha ao registrar clique de divulgação", error);
  }

  const destination = new URL(productPath(product), request.url);
  destination.searchParams.set("utm_source", source);
  destination.searchParams.set("utm_medium", "organic");
  destination.searchParams.set("utm_campaign", campaign);
  destination.searchParams.set("utm_content", content);

  return NextResponse.redirect(destination, 302);
}
