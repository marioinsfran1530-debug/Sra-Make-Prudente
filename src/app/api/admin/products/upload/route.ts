import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const BUCKET = "product-images";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const WEBP_QUALITY = 80;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function POST(request: NextRequest) {
  const { error, status } = await requireAdmin("EDITOR");

  if (error) {
    return NextResponse.json(
      { error },
      { status }
    );
  }

  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const productId = formData.get("productId");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error:
            "Nenhuma imagem foi enviada.",
        },
        { status: 400 }
      );
    }

    if (
      typeof productId !== "string" ||
      !productId
    ) {
      return NextResponse.json(
        {
          error:
            "Produto não informado.",
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error:
            "Formato inválido. Use JPG, PNG ou WebP.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error:
            "A imagem original deve ter no máximo 10 MB.",
        },
        { status: 400 }
      );
    }

    const product =
      await prisma.product.findUnique({
        where: {
          id: productId,
        },
        select: {
          id: true,
        },
      });

    if (!product) {
      return NextResponse.json(
        {
          error:
            "Produto não encontrado.",
        },
        { status: 404 }
      );
    }

    const originalBuffer = Buffer.from(
      await file.arrayBuffer()
    );

    const optimizedBuffer = await sharp(
      originalBuffer
    )
      .rotate()
      .resize({
        width: MAX_WIDTH,
        height: MAX_HEIGHT,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: WEBP_QUALITY,
        effort: 4,
      })
      .toBuffer();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const fileName =
      `${crypto.randomUUID()}.webp`;

    const storagePath =
      `${productId}/${fileName}`;

    const { error: uploadError } =
      await supabase.storage
        .from(BUCKET)
        .upload(
          storagePath,
          optimizedBuffer,
          {
            contentType:
              "image/webp",
            cacheControl:
              "31536000",
            upsert: false,
          }
        );

    if (uploadError) {
      console.error(
        "Erro no upload:",
        uploadError
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível enviar a imagem para o Storage.",
        },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    const lastImage =
      await prisma.productImage.findFirst({
        where: {
          productId,
        },
        orderBy: {
          order: "desc",
        },
        select: {
          order: true,
        },
      });

    const image =
      await prisma.productImage.create({
        data: {
          productId,
          url: publicUrl,
          storagePath,
          order: lastImage
            ? lastImage.order + 1
            : 0,
        },
      });

    return NextResponse.json({
      image: {
        id: image.id,
        url: image.url,
        storagePath:
          image.storagePath,
        order: image.order,
      },

      optimization: {
        originalBytes:
          file.size,
        optimizedBytes:
          optimizedBuffer.length,
      },
    });
  } catch (error) {
    console.error(
      "Erro ao processar upload:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao processar a imagem.",
      },
      { status: 500 }
    );
  }
}
