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
    const brand = item.replace(/\s+/g, " ").trim().slice(0, 100);
    const normalized = brand.toLocaleLowerCase("pt-BR");
    if (!brand || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(brand);
  }

  return result;
}

function cleanIdList(value: unknown) {
  if (!Array.isArray(value)) return null;
  const ids = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set(ids)];
}

function textArraySql(values: string[]) {
  if (values.length === 0) return Prisma.sql`ARRAY[]::TEXT[]`;
  return Prisma.sql`ARRAY[${Prisma.join(values.map((value) => Prisma.sql`${value}`))}]::TEXT[]`;
}

async function validateTaggedProducts(ids: string[], tag: "featured" | "isNew") {
  if (ids.length === 0) return true;
  const existing = await prisma.product.findMany({
    where: { id: { in: ids }, active: true, [tag]: true },
    select: { id: true },
  });
  return existing.length === ids.length;
}

async function validateProductIds(ids: string[]) {
  if (ids.length === 0) return true;
  const existing = await prisma.product.findMany({
    where: { id: { in: ids }, active: true },
    select: { id: true },
  });
  return existing.length === ids.length;
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
        return NextResponse.json(
          { error: "A ordem das categorias contém itens duplicados." },
          { status: 400 }
        );
      }
      const existing = await prisma.category.findMany({
        where: { id: { in: uniqueIds } },
        select: { id: true },
      });
      if (existing.length !== uniqueIds.length) {
        return NextResponse.json(
          { error: "Uma das categorias não foi encontrada." },
          { status: 400 }
        );
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
        return NextResponse.json(
          { error: "Visibilidade de categoria inválida." },
          { status: 400 }
        );
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
    const offerOrder = cleanIdList(body.offerOrder);
    const featuredOrder = cleanIdList(body.featuredOrder);
    const newOrder = cleanIdList(body.newOrder);
    const hiddenOffers = cleanIdList(body.hiddenOffers);
    const hiddenFeatured = cleanIdList(body.hiddenFeatured);
    const hiddenPopular = cleanIdList(body.hiddenPopular);
    const hiddenNew = cleanIdList(body.hiddenNew);

    if (offerOrder !== null && !(await validateProductIds(offerOrder))) {
      return NextResponse.json(
        { error: "A ordem de Ofertas contém produto inativo ou inexistente." },
        { status: 400 }
      );
    }
    if (featuredOrder !== null && !(await validateTaggedProducts(featuredOrder, "featured"))) {
      return NextResponse.json(
        { error: "Destaques contém produto inativo, inexistente ou sem a tag Destaque." },
        { status: 400 }
      );
    }
    if (newOrder !== null && !(await validateTaggedProducts(newOrder, "isNew"))) {
      return NextResponse.json(
        { error: "Novidades contém produto inativo, inexistente ou sem a tag Novidade." },
        { status: 400 }
      );
    }

    const visibilityLists = [hiddenOffers, hiddenFeatured, hiddenPopular, hiddenNew]
      .filter((value): value is string[] => value !== null)
      .flat();
    if (!(await validateProductIds([...new Set(visibilityLists)]))) {
      return NextResponse.json(
        { error: "A visibilidade contém produto inativo ou inexistente." },
        { status: 400 }
      );
    }

    const hasStoreUpdate =
      brandOrder !== null ||
      hiddenBrands !== null ||
      offerOrder !== null ||
      featuredOrder !== null ||
      newOrder !== null ||
      hiddenOffers !== null ||
      hiddenFeatured !== null ||
      hiddenPopular !== null ||
      hiddenNew !== null;

    if (hasStoreUpdate) {
      const settings = await prisma.storeSettings.findFirst({ select: { id: true } });
      if (!settings) {
        return NextResponse.json(
          { error: "Configure primeiro as informações básicas da loja." },
          { status: 400 }
        );
      }

      if (brandOrder !== null) {
        await prisma.$executeRaw(
          Prisma.sql`UPDATE "StoreSettings" SET "homeBrandOrder" = ${textArraySql(brandOrder)}, "updatedAt" = NOW() WHERE "id" = ${settings.id}`
        );
      }
      if (hiddenBrands !== null) {
        await prisma.$executeRaw(
          Prisma.sql`UPDATE "StoreSettings" SET "homeHiddenBrands" = ${textArraySql(hiddenBrands)}, "updatedAt" = NOW() WHERE "id" = ${settings.id}`
        );
      }
      if (offerOrder !== null) {
        await prisma.$executeRaw(
          Prisma.sql`UPDATE "StoreSettings" SET "homeOfferOrder" = ${textArraySql(offerOrder)}, "updatedAt" = NOW() WHERE "id" = ${settings.id}`
        );
      }
      if (featuredOrder !== null) {
        await prisma.storeSettings.update({
          where: { id: settings.id },
          data: { homeFeaturedOrder: featuredOrder },
        });
      }
      if (newOrder !== null) {
        await prisma.storeSettings.update({
          where: { id: settings.id },
          data: { homeNewOrder: newOrder },
        });
      }
      if (hiddenOffers !== null) {
        await prisma.$executeRaw(
          Prisma.sql`UPDATE "StoreSettings" SET "homeHiddenOffers" = ${textArraySql(hiddenOffers)}, "updatedAt" = NOW() WHERE "id" = ${settings.id}`
        );
      }
      if (hiddenFeatured !== null) {
        await prisma.$executeRaw(
          Prisma.sql`UPDATE "StoreSettings" SET "homeHiddenFeatured" = ${textArraySql(hiddenFeatured)}, "updatedAt" = NOW() WHERE "id" = ${settings.id}`
        );
      }
      if (hiddenPopular !== null) {
        await prisma.$executeRaw(
          Prisma.sql`UPDATE "StoreSettings" SET "homeHiddenPopular" = ${textArraySql(hiddenPopular)}, "updatedAt" = NOW() WHERE "id" = ${settings.id}`
        );
      }
      if (hiddenNew !== null) {
        await prisma.$executeRaw(
          Prisma.sql`UPDATE "StoreSettings" SET "homeHiddenNew" = ${textArraySql(hiddenNew)}, "updatedAt" = NOW() WHERE "id" = ${settings.id}`
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
