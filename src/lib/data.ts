import { prisma } from "@/lib/prisma";
import { cache } from "react";
import { productStockStatus, type StockStatus } from "@/lib/stock";
import { productIdFromLegacySlug, productSlug } from "@/lib/product-url";
import { searchProducts } from "@/lib/product-search";
import { createSlugIndex } from "@/lib/slug-index";
import { createTtlCache } from "@/lib/ttl-cache";
import { pickRelated } from "@/lib/related-products";

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
  categoryId?: string;
  categorySlug?: string;
  subcategorySlug?: string;
  brand?: string;
  search?: string;
  featured?: boolean;
  isNew?: boolean;
  bestSeller?: boolean;
  maxPrice?: number;
};

function queryActiveProducts(where: Record<string, unknown>) {
  return prisma.product.findMany({
    where,
    include: PRODUCT_INCLUDE,
    orderBy: [
      { featured: "desc" },
      { bestSeller: "desc" },
      { isNew: "desc" },
      { createdAt: "desc" },
    ],
  });
}

// Quanto tempo (no máximo) uma alteração feita no painel leva para aparecer na home e
// nas listas gerais. Páginas de categoria e de produto já funcionam assim (60 s).
const CATALOG_CACHE_MS = 30_000;

const activeCatalogCache = createTtlCache(
  () => queryActiveProducts({ active: true }),
  CATALOG_CACHE_MS
);

// Índice dos endereços dos produtos (ver src/lib/slug-index.ts).
const productSlugIndex = createSlugIndex({
  load: () =>
    prisma.product.findMany({
      where: { active: true },
      select: { id: true, name: true, brand: true },
    }),
  slugOf: productSlug,
  ttlMs: 5 * 60_000,
  missRefreshMs: 30_000,
});

async function loadProducts(filters: ProductFilters, allowApproximate: boolean) {
  const where: Record<string, unknown> = { active: true };

  if (filters.categoryId) {
    // Em páginas de categoria já resolvidas, filtrar pelo ID evita qualquer
    // ambiguidade de slug e nunca cai em uma listagem geral por acidente.
    // Mantém também as categorias secundárias escolhidas no cadastro.
    where.OR = [
      { categoryId: filters.categoryId },
      {
        categories: {
          some: {
            categoryId: filters.categoryId,
          },
        },
      },
    ];
  } else if (filters.categorySlug) {
    // API/buscas que recebem apenas slug continuam filtrando estritamente
    // pela categoria principal ou por uma categoria secundária vinculada.
    where.OR = [
      { category: { slug: filters.categorySlug } },
      {
        categories: {
          some: {
            category: { slug: filters.categorySlug },
          },
        },
      },
    ];
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

  // Sem filtro de banco (home, busca, lista geral) o catálogo inteiro é igual para
  // todo mundo: reaproveita a leitura por alguns segundos em vez de reler tudo a cada
  // visita. A busca por texto continua sendo feita aqui, em memória, como antes.
  const hasDatabaseFilter = Object.keys(where).length > 1;
  const products = hasDatabaseFilter
    ? await queryActiveProducts(where)
    : [...(await activeCatalogCache.get())];

  if (!filters.search) return { products, approximate: false };

  const result = searchProducts(products, filters.search, { allowApproximate });
  return { products: result.items, approximate: result.approximate };
}

// Listagens de página (categorias, SEO) nunca recebem resultados aproximados.
export async function getProducts(filters: ProductFilters = {}) {
  const { products } = await loadProducts(filters, false);
  return products.map(mapProduct);
}

// Igual ao getProducts, mas informa quando o resultado é aproximado (a pessoa
// digitou com erro ou a palavra incompleta e nada bateu exatamente).
export async function searchPublicProducts(filters: ProductFilters = {}) {
  const { products, approximate } = await loadProducts(filters, true);
  return { products: products.map(mapProduct), approximate };
}

export const getProductById = cache(async (id: string) => {
  const product = await prisma.product.findFirst({
    where: { id, active: true },
    include: PRODUCT_INCLUDE,
  });

  return product ? mapProduct(product) : null;
});

export const getProductByIdentifier = cache(async (identifier: string) => {
  const productById = await getProductById(identifier);
  if (productById) return productById;

  const legacyProductId = productIdFromLegacySlug(identifier);
  if (legacyProductId) return getProductById(legacyProductId);

  const candidate = await productSlugIndex.find(identifier);
  if (!candidate) return null;

  return getProductById(candidate.id);
});

// Só vale como "comprou junto" o que aconteceu em pelo menos 2 pedidos: com 1 só pode ser
// coincidência (ex.: um kit de cílios e um adesivo de espinhas na mesma sacola).
const CO_PURCHASE_MIN_ORDERS = 2;

// Produtos que aparecem nos mesmos pedidos que `productId` (balcão e site, pedidos não
// cancelados). Pedido grande pesa menos: uma cesta de 26 itens não diz que um item
// "combina" com outro, já um pedido de 2 itens diz.
async function coPurchasedProductIds(productId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ productId: string }>>`
    with mine as (
      select distinct oi."orderId"
      from "OrderItem" oi
      join "Order" o on o."id" = oi."orderId"
      where oi."productId" = ${productId} and o."status"::text <> 'CANCELADO'
    ),
    sizes as (
      select oi."orderId", count(distinct oi."productId") as n
      from "OrderItem" oi
      where oi."orderId" in (select "orderId" from mine)
      group by oi."orderId"
    )
    select oi."productId" as "productId"
    from "OrderItem" oi
    join sizes s on s."orderId" = oi."orderId"
    where oi."productId" <> ${productId}
    group by oi."productId"
    having count(distinct oi."orderId") >= ${CO_PURCHASE_MIN_ORDERS}::int
    order by sum(1.0 / (s.n - 1)) desc, count(distinct oi."orderId") desc
    limit 20
  `;
  return rows.map((row) => row.productId);
}

// Sugestões da página do produto. Nunca derruba a página: se algo falhar, não mostra.
export async function getRelatedProducts(product: PublicProduct) {
  try {
    const [coPurchased, catalog] = await Promise.all([
      coPurchasedProductIds(product.id),
      activeCatalogCache.get(),
    ]);
    return pickRelated(product, coPurchased, catalog.map(mapProduct));
  } catch (error) {
    console.error("getRelatedProducts", error);
    return { together: [], similar: [] };
  }
}

export const getStoreSettings = cache(async () => {
  return prisma.storeSettings.findFirst();
});

export async function getBrands() {
  const rows = await prisma.product.findMany({
    where: { active: true },
    select: { brand: true },
    distinct: ["brand"],
    orderBy: { brand: "asc" },
  });

  return rows.map((r) => r.brand);
}
