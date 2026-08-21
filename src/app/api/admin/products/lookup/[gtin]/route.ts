import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

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
  source: "cosmos" | "open_beauty_facts";
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

async function lookupCosmos(gtin: string): Promise<LookupResult | null> {
  const token = process.env.COSMOS_API_TOKEN?.trim();
  const userAgent = process.env.COSMOS_API_USER_AGENT?.trim();
  if (!token || !userAgent) return null;

  const response = await fetch(`https://cosmos.bluesoft.com.br/api/gtins/${gtin}.json`, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Cosmos-Token": token,
      "User-Agent": userAgent,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (response.status === 404 || response.status === 422) return null;
  if (!response.ok) {
    throw new Error(`COSMOS_${response.status}`);
  }

  const data = await response.json();
  const description = typeof data.description === "string" ? data.description.trim() : null;
  const brand = typeof data.brand?.name === "string" ? data.brand.name.trim() : null;
  const ncm = typeof data.ncm?.code === "string" ? data.ncm.code : null;
  const ncmDescription =
    typeof data.ncm?.full_description === "string"
      ? data.ncm.full_description
      : typeof data.ncm?.description === "string"
        ? data.ncm.description
        : null;
  const category = typeof data.gpc?.description === "string" ? data.gpc.description : null;
  const imageUrl = typeof data.thumbnail === "string" && data.thumbnail ? data.thumbnail : null;

  return {
    gtin,
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
  const name =
    (typeof product.product_name_pt === "string" && product.product_name_pt.trim()) ||
    (typeof product.product_name === "string" && product.product_name.trim()) ||
    null;
  const description =
    (typeof product.generic_name_pt === "string" && product.generic_name_pt.trim()) ||
    (typeof product.generic_name === "string" && product.generic_name.trim()) ||
    name;
  const imageUrl =
    (typeof product.image_front_url === "string" && product.image_front_url) ||
    (typeof product.image_url === "string" && product.image_url) ||
    null;

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

  let cosmosUnavailable = false;

  try {
    const cosmos = await lookupCosmos(gtin);
    if (cosmos) return NextResponse.json({ product: cosmos });
  } catch {
    cosmosUnavailable = true;
  }

  try {
    const openBeautyFacts = await lookupOpenBeautyFacts(gtin);
    if (openBeautyFacts) {
      return NextResponse.json({ product: openBeautyFacts, cosmosUnavailable });
    }
  } catch {
    // Retorna mensagem controlada abaixo.
  }

  return NextResponse.json(
    {
      error: cosmosUnavailable
        ? "Não foi possível consultar o Cosmos e o produto não foi encontrado na base alternativa."
        : "Produto não encontrado nas bases consultadas.",
      cosmosConfigured: Boolean(
        process.env.COSMOS_API_TOKEN?.trim() && process.env.COSMOS_API_USER_AGENT?.trim()
      ),
    },
    { status: 404 }
  );
}
