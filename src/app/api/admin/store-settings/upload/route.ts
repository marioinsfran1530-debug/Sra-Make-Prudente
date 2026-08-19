import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { requireAdmin } from "@/lib/admin-auth";
import {
  createStorefrontStorageClient,
  removeStorefrontAssets,
  STOREFRONT_BUCKET,
  type StorefrontAssetKind,
} from "@/lib/storefront-assets";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_INPUT_PIXELS = 40_000_000;
const MAX_INPUT_DIMENSION = 12_000;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
const DIMENSIONS = {
  logo: { width: 600, height: 600 },
  bannerDesktop: { width: 1920, height: 900 },
  bannerMobile: { width: 900, height: 1200 },
} as const;

export async function POST(request: NextRequest) {
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const kind = formData.get("kind");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Nenhuma imagem foi enviada." }, { status: 400 });
    }
    if (typeof kind !== "string" || !(kind in DIMENSIONS)) {
      return NextResponse.json({ error: "Tipo de imagem inválido." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Formato inválido. Use JPG, PNG ou WebP." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "A imagem original deve ter no máximo 10 MB." }, { status: 400 });
    }

    const original = Buffer.from(await file.arrayBuffer());
    const image = sharp(original, { limitInputPixels: MAX_INPUT_PIXELS });
    const metadata = await image.metadata();
    if (
      !metadata.format ||
      !ALLOWED_FORMATS.has(metadata.format) ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > MAX_INPUT_DIMENSION ||
      metadata.height > MAX_INPUT_DIMENSION ||
      metadata.width * metadata.height > MAX_INPUT_PIXELS
    ) {
      return NextResponse.json({ error: "A imagem possui formato ou dimensões inválidas." }, { status: 400 });
    }

    const dimensions = DIMENSIONS[kind as StorefrontAssetKind];
    const optimized = await image
      .rotate()
      .resize({ ...dimensions, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();
    const storagePath = `storefront/${kind}/${crypto.randomUUID()}.webp`;
    const supabase = createStorefrontStorageClient();
    const { error: uploadError } = await supabase.storage
      .from(STOREFRONT_BUCKET)
      .upload(storagePath, optimized, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      console.error("Erro no upload da vitrine:", uploadError);
      return NextResponse.json({ error: "Não foi possível enviar a imagem." }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from(STOREFRONT_BUCKET).getPublicUrl(storagePath);
    return NextResponse.json({
      image: { url: publicUrl, storagePath },
      optimization: { originalBytes: file.size, optimizedBytes: optimized.length, format: "webp" },
    });
  } catch (uploadError) {
    console.error("Erro ao processar imagem da vitrine:", uploadError);
    return NextResponse.json({ error: "Arquivo inválido ou imagem grande demais." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  try {
    const { storagePath } = await request.json();
    if (typeof storagePath !== "string" || !/^storefront\/(logo|bannerDesktop|bannerMobile)\/[0-9a-f-]+\.webp$/.test(storagePath)) {
      return NextResponse.json({ error: "Caminho de imagem inválido." }, { status: 400 });
    }
    await removeStorefrontAssets(createStorefrontStorageClient(), [storagePath]);
    return NextResponse.json({ success: true });
  } catch (deleteError) {
    console.error("Erro ao remover imagem da vitrine:", deleteError);
    return NextResponse.json({ error: "Não foi possível remover a imagem." }, { status: 500 });
  }
}
