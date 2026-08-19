import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import {
  createStorefrontStorageClient,
  isAllowedCtaUrl,
  removeStorefrontAssets,
  validateStorefrontAsset,
} from "@/lib/storefront-assets";

export async function GET() {
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });
  const settings = await prisma.storeSettings.findFirst();
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  const supabase = createStorefrontStorageClient();
  let newPaths: string[] = [];
  let assetsCompensated = false;

  try {
    const body = await request.json();
    const current = await prisma.storeSettings.findFirst();
    const storeName = String(body.storeName ?? "Sra Make Prudente").trim();
    const whatsapp = String(body.whatsapp ?? "").trim();
    const primaryCtaUrl = String(body.primaryCtaUrl ?? "").trim();
    const secondaryCtaUrl = String(body.secondaryCtaUrl ?? "").trim();

    if (!storeName) {
      return NextResponse.json({ error: "O nome da loja é obrigatório." }, { status: 400 });
    }
    if (!whatsapp) {
      return NextResponse.json({ error: "O WhatsApp é obrigatório." }, { status: 400 });
    }
    if (primaryCtaUrl && !isAllowedCtaUrl(primaryCtaUrl)) {
      return NextResponse.json({ error: "O link do CTA principal deve ser um caminho interno ou uma URL HTTPS." }, { status: 400 });
    }
    if (secondaryCtaUrl && !isAllowedCtaUrl(secondaryCtaUrl)) {
      return NextResponse.json({ error: "O link do CTA secundário deve ser um caminho interno ou uma URL HTTPS." }, { status: 400 });
    }

    const logo = validateStorefrontAsset(supabase, "logo", body.logoUrl, body.logoStoragePath);
    const bannerDesktop = validateStorefrontAsset(
      supabase,
      "bannerDesktop",
      body.bannerDesktopUrl,
      body.bannerDesktopStoragePath
    );
    const bannerMobile = validateStorefrontAsset(
      supabase,
      "bannerMobile",
      body.bannerMobileUrl,
      body.bannerMobileStoragePath
    );

    const assets = [
      { next: logo.storagePath, old: current?.logoStoragePath },
      { next: bannerDesktop.storagePath, old: current?.bannerDesktopStoragePath },
      { next: bannerMobile.storagePath, old: current?.bannerMobileStoragePath },
    ];
    newPaths = assets
      .filter(({ next, old }) => next && next !== old)
      .map(({ next }) => next as string);

    const data = {
      storeName,
      whatsapp,
      instagram: String(body.instagram ?? "").trim() || null,
      facebook: String(body.facebook ?? "").trim() || null,
      address: String(body.address ?? "").trim() || null,
      googleMapsUrl: String(body.googleMapsUrl ?? "").trim() || null,
      businessHours: String(body.businessHours ?? "").trim() || null,
      logoUrl: logo.url,
      logoStoragePath: logo.storagePath,
      bannerDesktopUrl: bannerDesktop.url,
      bannerDesktopStoragePath: bannerDesktop.storagePath,
      bannerMobileUrl: bannerMobile.url,
      bannerMobileStoragePath: bannerMobile.storagePath,
      heroEyebrow: String(body.heroEyebrow ?? "").trim() || null,
      heroTitle: String(body.heroTitle ?? "").trim() || null,
      heroSubtitle: String(body.heroSubtitle ?? "").trim() || null,
      primaryCtaLabel: String(body.primaryCtaLabel ?? "").trim() || null,
      primaryCtaUrl: primaryCtaUrl || null,
      secondaryCtaLabel: String(body.secondaryCtaLabel ?? "").trim() || null,
      secondaryCtaUrl: secondaryCtaUrl || null,
      highlight1: String(body.highlight1 ?? "").trim() || null,
      highlight2: String(body.highlight2 ?? "").trim() || null,
      highlight3: String(body.highlight3 ?? "").trim() || null,
    };

    const settings = current
      ? await prisma.storeSettings.update({ where: { id: current.id }, data })
      : await prisma.storeSettings.create({ data });

    const oldPaths = assets
      .filter(({ next, old }) => old && old !== next)
      .map(({ old }) => old as string);
    try {
      await removeStorefrontAssets(supabase, oldPaths);
    } catch (storageError) {
      console.error("ERRO AO REMOVER ASSETS ANTIGOS DA VITRINE:", storageError);
    }

    return NextResponse.json({ settings });
  } catch (saveError) {
    if (newPaths.length) {
      try {
        await removeStorefrontAssets(supabase, newPaths);
        assetsCompensated = true;
      } catch (storageError) {
        console.error("ERRO AO LIMPAR NOVOS ASSETS DA VITRINE:", storageError);
      }
    }
    console.error("ERRO AO SALVAR CONFIGURAÇÕES DA LOJA:", saveError);
    const message = saveError instanceof Error && saveError.message.includes("imagem")
      ? saveError.message
      : "Não foi possível salvar as informações da loja.";
    return NextResponse.json(
      { error: message, assetsCompensated },
      { status: message.includes("imagem") ? 400 : 500 }
    );
  }
}
