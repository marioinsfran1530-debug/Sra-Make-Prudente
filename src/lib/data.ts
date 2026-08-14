import { prisma } from "@/lib/prisma";
import { productStockStatus, type StockStatus } from "@/lib/stock";

// Camada de leitura pública. Regra do plano (seção 3): o Prisma não passa
// pelas policies de RLS do Supabase, então TODO filtro de "ativo" precisa
// ser explícito aqui no código — nunca confiar só no banco.

export type PublicProduct = Awaited<ReturnType<typeof mapProduct>>;

const PRODUCT_INCLUDE = {
  category: true,
  subcategory: true,
  images: { orderBy: { order: "asc" as const } },
  variants: { where: { active: true }, orderBy: { createdAt: "asc" as const } },
};

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
    images: { id: string; url: string; alt: string | null }[];
    variants: { id: string; name: string; stockQty: number; active: boolean; price: unknown; promoPrice: unknown }[];
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
    subcategory: p.subcategory,
    images: p.images,
    variants: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
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

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findFirst({
    where: { slug, active: true },
    include: { subcategories: { orderBy: { name: "asc" } } },
  });
}

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
  const where: Record<string, unknown> = { active: true };

  if (filters.categorySlug) {
    where.category = { slug: filters.categorySlug };
  }
  if (filters.subcategorySlug) {
    where.subcategory = { slug: filters.subcategorySlug };
  }
  if (filters.brand) {
    where.brand = filters.brand;
  }
  if (filters.featured) where.featured = true;
  if (filters.isNew) where.isNew = true;
  if (filters.bestSeller) where.bestSeller = true;
  if (filters.maxPrice) {
    where.price = { lte: filters.maxPrice };
  }
  if (filters.search) {
    const q = filters.search;
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
      { category: { name: { contains: q, mode: "insensitive" } } },
      { subcategory: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    include: PRODUCT_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return products.map(mapProduct);
}

export async function getProductById(id: string) {
  const product = await prisma.product.findFirst({
    where: { id, active: true },
    include: PRODUCT_INCLUDE,
  });
  return product ? mapProduct(product) : null;
}

export async function getStoreSettings() {
  return prisma.storeSettings.findFirst();
}

export async function getBrands() {
  const rows = await prisma.product.findMany({
    where: { active: true },
    select: { brand: true },
    distinct: ["brand"],
    orderBy: { brand: "asc" },
  });
  return rows.map((r) => r.brand);
}
