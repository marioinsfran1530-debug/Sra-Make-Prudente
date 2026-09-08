import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { productPath } from "@/lib/product-url";
import { DICAS } from "@/lib/dicas";

const SITE_URL = "https://www.sramakeprudente.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products, settings] = await Promise.all([
    prisma.category.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.product.findMany({
      where: { active: true },
      select: { name: true, brand: true, updatedAt: true },
    }),
    prisma.storeSettings.findFirst({ select: { updatedAt: true } }),
  ]);

  const latestProductUpdate = products.reduce<Date | null>(
    (latest, product) =>
      !latest || product.updatedAt > latest ? product.updatedAt : latest,
    null
  );

  const catalogLastModified = [settings?.updatedAt ?? null, latestProductUpdate]
    .filter((date): date is Date => Boolean(date))
    .reduce<Date | undefined>(
      (latest, date) => (!latest || date > latest ? date : latest),
      undefined
    );

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      ...(catalogLastModified ? { lastModified: catalogLastModified } : {}),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/categoria`,
      ...(catalogLastModified ? { lastModified: catalogLastModified } : {}),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/categoria/lash/cilios-tufinho`,
      ...(catalogLastModified ? { lastModified: catalogLastModified } : {}),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/dicas`,
      lastModified: new Date("2026-09-08T12:00:00-03:00"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/loja`,
      ...(settings?.updatedAt ? { lastModified: settings.updatedAt } : {}),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const dicaRoutes: MetadataRoute.Sitemap = DICAS.map((dica) => ({
    url: `${SITE_URL}/dicas/${dica.slug}`,
    lastModified: new Date(`${dica.updatedAt}T12:00:00-03:00`),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${SITE_URL}/categoria/${category.slug}`,
    lastModified: category.updatedAt,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}${productPath(product)}`,
    lastModified: product.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...dicaRoutes, ...categoryRoutes, ...productRoutes];
}
