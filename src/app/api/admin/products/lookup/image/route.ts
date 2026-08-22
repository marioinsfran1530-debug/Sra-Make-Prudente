import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { requireAdmin } from "@/lib/admin-auth";

const MAX_REMOTE_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;

function isAllowedHost(hostname: string) {
  const host = hostname.toLowerCase();

  return (
    host === "bluesoft.com.br" ||
    host.endsWith(".bluesoft.com.br") ||
    host === "openbeautyfacts.org" ||
    host.endsWith(".openbeautyfacts.org") ||
    host === "openfoodfacts.org" ||
    host.endsWith(".openfoodfacts.org") ||
    host === "openfoodfacts.net" ||
    host.endsWith(".openfoodfacts.net")
  );
}

export async function GET(request: NextRequest) {
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  const source = request.nextUrl.searchParams.get("url")?.trim();

  if (!source) {
    return NextResponse.json({ error: "Imagem não informada." }, { status: 400 });
  }

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source);
  } catch {
    return NextResponse.json({ error: "URL da imagem inválida." }, { status: 400 });
  }

  if (sourceUrl.protocol !== "https:" || !isAllowedHost(sourceUrl.hostname)) {
    return NextResponse.json(
      { error: "Esta origem de imagem não é permitida." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,image/*,*/*;q=0.8",
        "User-Agent": "SraMakePrudente/1.0 (product image import)",
      },
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Não foi possível baixar a foto sugerida." },
        { status: 502 }
      );
    }

    const declaredSize = Number(response.headers.get("content-length") || 0);
    if (declaredSize > MAX_REMOTE_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "A foto sugerida é maior que 10 MB." },
        { status: 413 }
      );
    }

    const originalBuffer = Buffer.from(await response.arrayBuffer());
    if (originalBuffer.length > MAX_REMOTE_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "A foto sugerida é maior que 10 MB." },
        { status: 413 }
      );
    }

    // O Cosmos pode devolver AVIF, GIF, WebP ou até um Content-Type genérico.
    // Em vez de confiar apenas no cabeçalho HTTP, deixamos o Sharp validar os bytes
    // e normalizamos toda imagem válida para WebP antes de enviar ao navegador.
    let normalizedBuffer: Buffer;
    try {
      normalizedBuffer = await sharp(originalBuffer, { animated: false })
        .rotate()
        .resize({
          width: MAX_WIDTH,
          height: MAX_HEIGHT,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();
    } catch {
      return NextResponse.json(
        { error: "A foto sugerida não pôde ser convertida para um formato compatível." },
        { status: 415 }
      );
    }

    return new NextResponse(normalizedBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(normalizedBuffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível importar a foto sugerida agora." },
      { status: 502 }
    );
  }
}
