import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function campaignKind(value: string | null) {
  if (value === "o") return "oferta";
  if (value === "n") return "novidade";
  return "destaque";
}

function campaignContent(value: string | null) {
  return value === "q" ? "quadrado" : "status";
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

  if (!/^[a-z0-9]{6,10}$/i.test(code)) {
    return NextResponse.redirect(new URL("/loja", request.url), 302);
  }

  const product = await prisma.product.findFirst({
    where: {
      id: { endsWith: code },
      active: true,
    },
    select: { id: true, name: true },
  });

  if (!product) {
    return NextResponse.redirect(new URL("/loja", request.url), 302);
  }

  const kind = campaignKind(request.nextUrl.searchParams.get("k"));
  const content = campaignContent(request.nextUrl.searchParams.get("f"));
  const date = campaignDate(request.nextUrl.searchParams.get("d"));
  const campaign = `${kind}-${slug(product.name)}-${date}`;

  // Métrica interna: não bloqueia o redirecionamento se houver falha de telemetria.
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
        utmSource: "whatsapp",
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

  const destination = new URL(`/produto/${product.id}`, request.url);
  destination.searchParams.set("utm_source", "whatsapp");
  destination.searchParams.set("utm_medium", "organic");
  destination.searchParams.set("utm_campaign", campaign);
  destination.searchParams.set("utm_content", content);

  return NextResponse.redirect(destination, 302);
}
