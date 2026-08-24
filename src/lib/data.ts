import { prisma } from "@/lib/prisma";
import { cache } from "react";
import { productStockStatus, type StockStatus } from "@/lib/stock";

// Camada de leitura pública. Regra do plano (seção 3): o Prisma não passa
// pelas policies de RLS do Supabase, então TODO filtro de "ativo" precisa
// ser explícito aqui no código — nunca confiar só no banco.

export type PublicProduct = Awaited<ReturnType<typeof mapProduct>>;

const PRODUCT_INCLUDE = {
  category: true,
  subcategory: true,
  categories: { include: { category: true } },
  images: { orderBy: { order: "asc" as const } },
  variants: { where: { active: true }, orderBy: { createdAt: "asc" as const } },
};

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function productMatchesSearch(
  product: {
    name: string;
    brand: string;
    sku: string | null;
    description: string | null;
    category: { name: string };
    subcategory: { name: string } | null;
    categories: { category: { name: string } }[];
    variants: { name: string }[];
  },
  query: string,
) {
  const terms = normalizeSearchText(query).split(" ").filter(Boolean);
  if (terms.length === 0) return true;

  const searchableText = normalizeSearchText(
    [
      product.name,
      product.brand,
      product.sku,
      product.description,
      product.category.name,
      product.subcategory?.name,
      ...product.categories.map((item) => item.category.name),
      ...product.variants.map((variant) => variant.name),
    ]
      .filter(Boolean)
      .join(" "),
  );

  return terms.every((term) => searchableText.includes(term));
}

function mapProduct<
  T extends {
    id: string;
    name: string;
    brand: string;
    sku: string | null;
    description: string | null;
    price: unknown;
    promoPrice: unknown;
    stockQty: number;
    featured: boolean;
    isNew: boolean;
    bestSeller: boolean;
    category: { id: string; name: string; slug: string };
    subcategory: { id: string; name: string; slug: string } | null;
    categories: { category: { id: string; name: string; slug: string } }[];
    images: { id: string; url: string; alt: string | null }[];
    variants: { id: string; name: string; sku: string | null; stockQty: number; active: boolean; price: unknown; promoPrice: unknown }[];
  }
>(p: T) {
  const stock: StockStatus = productStockStatus(p);
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    sku: p.sku,
    description: p.description,
    price: Number(p.price),
    promoPrice: p.promoPrice !== null ? Number(p.promoPrice) : null,
    stock,
    featured: p.featured,
    isNew: p.isNew,
    bestSeller: p.bestSeller,
    category: p.category,
    categories: p.categories.map((item) => item.category),
    subcategory: p.subcategory,
    images: p.images,
    variants: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      stock: productStockStatus({ stockQty: v.stockQty, variants: undefined }),
      price: v.price !== null ? Number(v.price) : null,
      promoPrice: v.promoPrice !== null ? Number(v.promoPrice) : null,
    })),
  };
}

export async function getCategories() {
  return prisma.category.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    include: {
      subcategories: { orderBy: { name: "asc" } },
    },
  });
}

export const getCategoryBySlug = cache(async (slug: string) => {
  return prisma.category.findFirst({
    where: { slug, active: true },
    include: {
      subcategories: {
        orderBy: { name: "asc" },
      },
    },
  });
});

export type ProductFilters = {
  categorySlug?: string;
  subcategorySlug?: string;
  brand?: string;
  search?: string;
  featured?: boolean;
  isNew?: boolean;
  bestSeller?: boolean;
  maxPrice?: number;
};

export async function getProducts(filters: ProductFilters = {}) {
  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(filters.featured ? { featured: true } : {}),
      ...(filters.isNew ? { isNew: true } : {}),
      ...(filters.bestSeller ? { bestSeller: true } : {}),
      ...(filters.brand ? { brand: filters.brand } : {}),
      ...(filters.categorySlug
        ? {
            OR: [
              { category: { slug: filters.categorySlug, active: true } },
              {
                categories: {
                  some: { category: { slug: filters.categorySlug, active: true } },
                },
              },
            ],
          }
        : {}),
      ...(filters.subcategorySlug
        ? { subcategory: { slug: filters.subcategorySlug, active: true } }
        : {}),
      ...(filters.maxPrice !== undefined
        ? {
            OR: [
              { promoPrice: { lte: filters.maxPrice } },
              { promoPrice: null, price: { lte: filters.maxPrice } },
            ],
          }
        : {}),
    },
    include: PRODUCT_INCLUDE,
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });

  const filteredProducts = filters.search
    ? products.filter((product) => productMatchesSearch(product, filters.search!))
    : products;

  return filteredProducts.map(mapProduct);
}

export async function getProductById(id: string) {
  const product = await prisma.product.findFirst({
    where: { id, active: true },
    include: PRODUCT_INCLUDE,
  });

  return product ? mapProduct(product) : null;
}

export async function getBrands() {
  const rows = await prisma.product.findMany({
    where: { active: true },
    select: { brand: true },
    distinct: ["brand"],
    orderBy: { brand: "asc" },
  });

  return rows.map((row) => row.brand);
}
