import React from "react";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getStoreSettings } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IconPreset = {
  size: number;
  logoRatio: number;
};

const PRESETS: Record<string, IconPreset> = {
  "192": { size: 192, logoRatio: 0.92 },
  "512": { size: 512, logoRatio: 0.92 },
  "maskable-192": { size: 192, logoRatio: 0.72 },
  "maskable-512": { size: 512, logoRatio: 0.72 },
  apple: { size: 180, logoRatio: 0.9 },
};

async function imageAsDataUrl(url: string | null | undefined) {
  if (!url) return null;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const variant = request.nextUrl.pathname.split("/").filter(Boolean).at(-1) || "512";
  const preset = PRESETS[variant];

  if (!preset) {
    return new Response("Ícone não encontrado.", { status: 404 });
  }

  const settings = await getStoreSettings();
  const logoDataUrl = await imageAsDataUrl(settings?.logoUrl);
  const logoSize = Math.round(preset.size * preset.logoRatio);

  const logo = logoDataUrl
    ? React.createElement("img", {
        src: logoDataUrl,
        alt: "",
        width: logoSize,
        height: logoSize,
        style: {
          width: `${logoSize}px`,
          height: `${logoSize}px`,
          borderRadius: "999px",
          objectFit: "cover",
        },
      })
    : React.createElement(
        "div",
        {
          style: {
            width: `${logoSize}px`,
            height: `${logoSize}px`,
            borderRadius: "999px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #E4127B 0%, #A6157A 55%, #6E1E8C 100%)",
            color: "white",
            fontSize: `${Math.round(preset.size * 0.28)}px`,
            fontWeight: 700,
          },
        },
        "SM"
      );

  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFF6FA",
        },
      },
      logo
    ),
    {
      width: preset.size,
      height: preset.size,
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    }
  );
}
