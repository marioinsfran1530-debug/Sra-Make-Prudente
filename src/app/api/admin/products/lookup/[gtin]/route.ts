import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

type LookupSource = "cosmos" | "open_beauty_facts" | "open_food_facts";

type LookupResult = {
  gtin: string;
  name: string | null;
  brand: string | null;
  description: string | null;
  imageUrl: string | null;
  ncm: string | null;
  ncmDescription: string | null;
  category: string | null;
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  source: LookupSource;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isValidGtin(value: string) {
  const digits = onlyDigits(value);
  if (![8, 12, 13, 14].includes(digits.length)) return false;

  const numbers = digits.split("").map(Number);
  const checkDigit = numbers.pop();
  if (checkDigit === undefined) return false;

  let sum = 0;
  for (let i = numbers.length - 1, position = 0; i >= 0; i--, position++) {
    sum += numbers[i] * (position % 2 === 0 ? 3 : 1);
  }

  return (10 - (sum % 10)) % 10 === checkDigit;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = Number(value.replace(/[^0-9,.-]/g, "").replace(",", "."));
    return Number.isFinite(normalized) ? normalized : null;
  }
  return null;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function normalizeCosmosProduct(data: any, gtin: string): LookupResult | null {
  if (!data || typeof data !== "object") return null;

  const description = firstText(data.description, data.name);
  const brand = firstText(data.brand?.name, data.brand);
  const ncm = firstText(data.ncm?.code, data.ncm_code);
  const ncmDescription = firstText(
    data.ncm?.full_description,
    data.ncm?.description,
    data.ncm_description
  );
  const category = firstText(data.gpc?.description, data.category?.description, data.category);
  const imageUrl = firstText(data.thumbnail, data.picture, data.image_url, data.image);

  if (!description && !brand && !ncm && !imageUrl) return null;

  return {
    gtin: String(data.gtin ?? gtin),
    name: description,
    brand,
    description,
    imageUrl,
    ncm,
    ncmDescription,
    category,
    avgPrice: asNumber(data.avg_price),
    minPrice: asNumber(data.min_price),
    maxPrice: asNumber(data.max_price),
    source: "cosmos",
  };
}

function cosmosHeaders(token: string, userAgent: string) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Cosmos-Token": token,
    "User-Agent": userAgent,
  };
}

async function fetchCosmosJson(url: string, token: string, userAgent: string) {
  const response = await fetch(url, {
    headers: cosmosHeaders(token, userAgent),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (response.status === 404 || response.status === 422) return null;
  if (!response.ok) throw new Error(`COSMOS_${response.status}`);
  return response.json();
}

async function lookupCosmos(gtin: string): Promise<LookupResult | null> {
  const token = process.env.COSMOS_API_TOKEN?.trim();
  const userAgent = process.env.COSMOS_API_USER_AGENT?.trim();
  if (!token || !userAgent) return null;

  // Endpoint oficial atual documentado pelo Cosmos.
  const directUrls = [
    `https://api.cosmos.bluesoft.com.br/gtins/${gtin}.json`,
    // Compatibilidade com o endpoint legado ainda publicado em parte da documentação.
    `https://cosmos.bluesoft.com.br/api/gtins/${gtin}.json`,
  ];

  for (const url of directUrls) {
    try {
      const data = await fetchCosmosJson(url, token, userAgent);
      const product = normalizeCosmosProduct(data, gtin);
      if (product) return product;
    } catch (error) {
      if (url === directUrls[directUrls.length - 1]) throw error;
    }
  }

  // Alguns itens aparecem na busca pública antes de responderem no recurso /gtins.
  // Nesses casos usamos a busca oficial por descrição/GTIN como segunda estratégia.
  const searchUrls = [
    `https://api.cosmos.bluesoft.com.br/products?query=${encodeURIComponent(gtin)}&per_page=10`,
    `https://cosmos.bluesoft.com.br/api/products?query=${encodeURIComponent(gtin)}&per_page=10`,
  ];

  for (const url of searchUrls) {
    try {
      const data = await fetchCosmosJson(url, token, userAgent);
      const candidates = Array.isArray(data)
        ? data
        : Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data?.items)
            ? data.items
            : [];

      const exact = candidates.find(
        (item: any) => onlyDigits(String(item?.gtin ?? item?.code ?? "")) === gtin
      );
      const candidate = exact ?? candidates[0];
      const product = normalizeCosmosProduct(candidate, gtin);
      if (product) return product;
    } catch (error) {
      if (url === searchUrls[searchUrls.length - 1]) throw error;
    }
  }

  return null;
}

async function lookupOpenBeautyFacts(gtin: string): Promise<LookupResult | null> {
  const fields = [
    "code",
    "product_name",
    "product_name_pt",
    "generic_name",
    "generic_name_pt",
    "brands",
    "image_front_url",
    "image_url",
    "categories",
  ].join(",");

  const response = await fetch(
    `https://world.openbeautyfacts.org/api/v2/product/${gtin}.json?fields=${encodeURIComponent(fields)}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "SraMakePrudente/1.0 (catalog product lookup)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  if (data?.status !== 1 || !data.product) return null;

  const product = data.product;
  const name = firstText(product.product_name_pt, product.product_name);
  const description = firstText(product.generic_name_pt, product.generic_name, name);
  const imageUrl = firstText(product.image_front_url, product.image_url);

  return {
    gtin,
    name,
    brand: typeof product.brands === "string" ? product.brands.split(",")[0]?.trim() || null : null,
    description,
    imageUrl,
    ncm: null,
    ncmDescription: null,
    category: typeof product.categories === "string" ? product.categories.split(",")[0]?.trim() || null : null,
    avgPrice: null,
    minPrice: null,
    maxPrice: null,
    source: "open_beauty_facts",
  };
}

async function lookupOpenFoodFacts(gtin: string): Promise<LookupResult | null> {
  const fields = [
    "code",
    "product_name",
    "product_name_pt",
    "generic_name",
    "generic_name_pt",
    "brands",
    "image_front_url",
    "image_url",
    "categories",
  ].join(",");

  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${gtin}.json?fields=${encodeURIComponent(fields)}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "SraMakePrudente/1.0 (catalog product lookup)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  if (data?.status !== 1 || !data.product) return null;

  const product = data.product;
  const name = firstText(product.product_name_pt, product.product_name);
  const description = firstText(product.generic_name_pt, product.generic_name, name);
  const imageUrl = firstText(product.image_front_url, product.image_url);

  return {
    gtin,
    name,
    brand: typeof product.brands === "string" ? product.brands.split(",")[0]?.trim() || null : null,
    description,
    imageUrl,
    ncm: null,
    ncmDescription: null,
    category: typeof product.categories === "string" ? product.categories.split(",")[0]?.trim() || null : null,
    avgPrice: null,
    minPrice: null,
    maxPrice: null,
    source: "open_food_facts",
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gtin: string }> }
) {
  const { error, status } = await requireAdmin("EDITOR");
  if (error) return NextResponse.json({ error }, { status });

  const { gtin: rawGtin } = await params;
  const gtin = onlyDigits(rawGtin);

  if (!isValidGtin(gtin)) {
    return NextResponse.json(
      { error: "Código de barras inválido. Confira o EAN/GTIN digitado." },
      { status: 400 }
    );
  }

  const cosmosConfigured = Boolean(
    process.env.COSMOS_API_TOKEN?.trim() && process.env.COSMOS_API_USER_AGENT?.trim()
  );
  let cosmosUnavailable = false;

  if (cosmosConfigured) {
    try {
      const cosmos = await lookupCosmos(gtin);
      if (cosmos) return NextResponse.json({ product: cosmos, cosmosConfigured: true });
    } catch {
      cosmosUnavailable = true;
    }
  }

  try {
    const openBeautyFacts = await lookupOpenBeautyFacts(gtin);
    if (openBeautyFacts) {
      return NextResponse.json({ product: openBeautyFacts, cosmosConfigured, cosmosUnavailable });
    }
  } catch {
    // Continua para a base genérica.
  }

  try {
    const openFoodFacts = await lookupOpenFoodFacts(gtin);
    if (openFoodFacts) {
      return NextResponse.json({ product: openFoodFacts, cosmosConfigured, cosmosUnavailable });
    }
  } catch {
    // Retorna mensagem controlada abaixo.
  }

  return NextResponse.json(
    {
      error: !cosmosConfigured
        ? "O Bluesoft Cosmos ainda não está configurado neste ambiente. Configure COSMOS_API_TOKEN e COSMOS_API_USER_AGENT na Vercel. O produto também não foi encontrado nas bases abertas alternativas."
        : cosmosUnavailable
          ? "A consulta ao Bluesoft Cosmos falhou no momento e o produto não foi encontrado nas bases alternativas."
          : "Produto não encontrado no Bluesoft Cosmos nem nas bases alternativas.",
      cosmosConfigured,
      cosmosUnavailable,
    },
    { status: 404 }
  );
}
