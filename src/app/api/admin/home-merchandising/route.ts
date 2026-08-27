import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

function cleanBrandList(value: unknown) {
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") continue;
    const brand = item.trim().slice(0, 100);
    if (!brand || seen.has(brand)) continue;
    seen.add(brand);
    result.push(brand);
  }

  return result;
}

function textArraySql(values: string[]) {
  if (values.length === 0) return Prisma.sql`ARRAY[]::TEXT[]`;
  return Prisma.sql`ARRAY[${Prisma.join(values.map((value) => Prisma.sql`${value}`))}]::TEXT[]`;
}

export async function PUT(request: NextRequest) {
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (Array.isArray(body.categoryOrder)) {
      const ids = body.categoryOrder
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
      const uniqueIds = [...new Set(ids)];

      if (uniqueIds.length !== ids.length) {
        return NextResponse.json({ error: "A ordem das categorias contém itens duplicados." }, { status: 400 });
      }

      const existing = await prisma.category.findMany({
        where: { id: { in: uniqueIds } },
        select: { id: true },
      });
      if (existing.length !== uniqueIds.length) {
        return NextResponse.json({ error: "Uma das categorias não foi encontrada." }, { status: 400 });
      }

      await prisma.$transaction(
        uniqueIds.map((id, index) =>
          prisma.category.update({ where: { id }, data: { order: index } })
        )
      );
    }

    if (body.categoryVisibility && typeof body.categoryVisibility === "object") {
      const input = body.categoryVisibility as Record<string, unknown>;
      const id = typeof input.id === "string" ? input.id.trim() : "";
      const showOnHome = input.showOnHome;

      if (!id || typeof showOnHome !== "boolean") {
        return NextResponse.json({ error: "Visibilidade de categoria inválida." }, { status: 400 });
      }

      const updated = await prisma.$executeRaw`
        UPDATE "Category"
        SET "showOnHome" = ${showOnHome}, "updatedAt" = NOW()
        WHERE "id" = ${id}
      `;
      if (updated === 0) {
        return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
      }
    }

    const brandOrder = cleanBrandList(body.brandOrder);
    const hiddenBrands = cleanBrandList(body.hiddenBrands);

    if (brandOrder !== null || hiddenBrands !== null) {
      const settings = await prisma.storeSettings.findFirst({ select: { id: true } });
      if (!settings) {
        return NextResponse.json(
          { error: "Configure primeiro as informações básicas da loja." },
          { status: 400 }
        );
      }

      if (brandOrder !== null && hiddenBrands !== null) {
        await prisma.$executeRaw(
          Prisma.sql`
            UPDATE "StoreSettings"
            SET "homeBrandOrder" = ${textArraySql(brandOrder)},
                "homeHiddenBrands" = ${textArraySql(hiddenBrands)},
                "updatedAt" = NOW()
            WHERE "id" = ${settings.id}
          `
        );
      } else if (brandOrder !== null) {
        await prisma.$executeRaw(
          Prisma.sql`
            UPDATE "StoreSettings"
            SET "homeBrandOrder" = ${textArraySql(brandOrder)}, "updatedAt" = NOW()
            WHERE "id" = ${settings.id}
          `
        );
      } else if (hiddenBrands !== null) {
        await prisma.$executeRaw(
          Prisma.sql`
            UPDATE "StoreSettings"
            SET "homeHiddenBrands" = ${textArraySql(hiddenBrands)}, "updatedAt" = NOW()
            WHERE "id" = ${settings.id}
          `
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (saveError) {
    console.error("ERRO AO SALVAR MERCHANDISING DA HOME:", saveError);
    return NextResponse.json(
      { error: "Não foi possível salvar a organização da vitrine." },
      { status: 500 }
    );
  }
}
