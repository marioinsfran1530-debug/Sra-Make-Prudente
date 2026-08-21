import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL = "https://sramakeprudente.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products, settings] = await Promise.all([
    prisma.category.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.product.findMany({
      where: { active: true },
      select: { id: true, updatedAt: true },
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
      url: `${SITE_URL}/loja`,
      ...(settings?.updatedAt ? { lastModified: settings.updatedAt } : {}),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${SITE_URL}/categoria/${category.slug}`,
    lastModified: category.updatedAt,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/produto/${product.id}`,
    lastModified: product.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
