import { NextRequest } from "next/server";
import sharp from "sharp";
import { getStoreSettings } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IconPreset = {
  size: number;
  logoRatio: number;
};

const PRESETS: Record<string, IconPreset> = {
  "32": { size: 32, logoRatio: 0.92 },
  "192": { size: 192, logoRatio: 0.92 },
  "512": { size: 512, logoRatio: 0.92 },
  "maskable-192": { size: 192, logoRatio: 0.72 },
  "maskable-512": { size: 512, logoRatio: 0.72 },
  apple: { size: 180, logoRatio: 0.9 },
};

function circleMask(size: number) {
  return Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`
  );
}

function fallbackLogo(size: number) {
  const fontSize = Math.max(12, Math.round(size * 0.31));
  return Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E4127B"/><stop offset="0.55" stop-color="#A6157A"/><stop offset="1" stop-color="#6E1E8C"/></linearGradient></defs><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#g)"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700">SM</text></svg>`
  );
}

async function fetchLogo(url: string | null | undefined) {
  if (!url) return null;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

async function buildIcon(source: Buffer | null, preset: IconPreset) {
  const logoSize = Math.max(1, Math.round(preset.size * preset.logoRatio));
  const logoBuffer = source
    ? await sharp(source)
        .resize(logoSize, logoSize, { fit: "cover", position: "centre" })
        .composite([{ input: circleMask(logoSize), blend: "dest-in" }])
        .png()
        .toBuffer()
    : await sharp(fallbackLogo(logoSize)).png().toBuffer();

  const offset = Math.round((preset.size - logoSize) / 2);
  return sharp({
    create: {
      width: preset.size,
      height: preset.size,
      channels: 4,
      background: "#FFF6FA",
    },
  })
    .composite([{ input: logoBuffer, left: offset, top: offset }])
    .png()
    .toBuffer();
}

export async function GET(request: NextRequest) {
  const variant = request.nextUrl.pathname.split("/").filter(Boolean).at(-1) || "512";
  const preset = PRESETS[variant];

  if (!preset) {
    return new Response("Ícone não encontrado.", { status: 404 });
  }

  try {
    const settings = await getStoreSettings();
    const source = await fetchLogo(settings?.logoUrl);
    const output = await buildIcon(source, preset);

    return new Response(new Uint8Array(output), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("ERRO AO GERAR ICONE DO APP:", error);
    return new Response("Não foi possível gerar o ícone.", { status: 500 });
  }
}
