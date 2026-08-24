import { prisma } from "@/lib/prisma";

const SITE_URL = "https://www.sramakeprudente.com.br";

function xml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function validGtin(value?: string | null) {
  if (!value) return null;
  const digits = value.trim();
  if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(digits)) return null;

  const body = digits.slice(0, -1);
  const check = Number(digits.at(-1));
  let sum = 0;
  for (let i = body.length - 1, pos = 0; i >= 0; i--, pos++) {
    sum += Number(body[i]) * (pos % 2 === 0 ? 3 : 1);
  }
  const expected = (10 - (sum % 10)) % 10;
  return expected === check ? digits : null;
}

function normalizedText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const COLOR_TERMS = [
  ["rosa", "Rosa"],
  ["pink", "Rosa"],
  ["vermelho", "Vermelho"],
  ["vermelha", "Vermelho"],
  ["red", "Vermelho"],
  ["vinho", "Vinho"],
  ["bordo", "Bordô"],
  ["roxo", "Roxo"],
  ["roxa", "Roxo"],
  ["lilas", "Lilás"],
  ["violeta", "Violeta"],
  ["azul", "Azul"],
  ["blue", "Azul"],
  ["verde", "Verde"],
  ["green", "Verde"],
  ["amarelo", "Amarelo"],
  ["amarela", "Amarelo"],
  ["laranja", "Laranja"],
  ["orange", "Laranja"],
  ["preto", "Preto"],
  ["preta", "Preto"],
  ["black", "Preto"],
  ["branco", "Branco"],
  ["branca", "Branco"],
  ["white", "Branco"],
  ["bege", "Bege"],
  ["nude", "Nude"],
  ["marrom", "Marrom"],
  ["brown", "Marrom"],
  ["dourado", "Dourado"],
  ["dourada", "Dourado"],
  ["gold", "Dourado"],
  ["prata", "Prata"],
  ["silver", "Prata"],
  ["cinza", "Cinza"],
  ["gray", "Cinza"],
  ["grey", "Cinza"],
  ["transparente", "Transparente"],
] as const;

function findColor(text: string) {
  for (const [term, label] of COLOR_TERMS) {
    const pattern = new RegExp(`(^|[^a-z0-9])${term}([^a-z0-9]|$)`);
    if (pattern.test(text)) return label;
  }
  return null;
}

function inferColor(name: string, description?: string | null) {
  const normalizedName = normalizedText(name);
  const normalizedDescription = normalizedText(description || "");
  const ambiguous = /\b(incolor|variad[oa]s?|sortid[oa]s?|colorid[oa]s?|multicolor)\b/;

  // Não inventa uma cor para produtos explicitamente incolores ou de cores variadas.
  if (ambiguous.test(normalizedName) || ambiguous.test(normalizedDescription)) return null;

  // O nome do produto é a fonte mais confiável para uma cor declarada.
  const nameColor = findColor(normalizedName);
  if (nameColor) return nameColor;

  // Na descrição, só considera cor quando ela estiver declarada como atributo.
  const explicitColor = normalizedDescription.match(/\bcor\s*[:\-]?\s*([a-z]+)/);
  if (explicitColor) return findColor(explicitColor[1]);

  return null;
}

function inferAudience(name: string, brand: string, category: string) {
  const text = normalizedText(`${name} ${brand} ${category}`);

  const ageGroup = /\b(bebe|baby|infantil|crianca|kids?)\b/.test(text) ? "kids" : "adult";
  const gender = /\b(masculino|masculina|homem|men)\b/.test(text)
    ? "male"
    : /\b(feminino|feminina|mulher|women)\b/.test(text)
      ? "female"
      : "unisex";

  return { ageGroup, gender } as const;
}

function validImageUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function GET() {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: {
      category: true,
      images: { orderBy: { order: "asc" } },
      variants: { where: { active: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const items = products
    .map((product) => {
      const imageUrls = product.images
        .map((image) => validImageUrl(image.url))
        .filter((url): url is string => Boolean(url));

      if (imageUrls.length === 0) return null;

      const variantStock = product.variants.reduce((sum, variant) => sum + Math.max(0, variant.stockQty), 0);
      const stock = product.variants.length > 0 ? variantStock : product.stockQty;
      const availability = stock > 0 ? "in_stock" : "out_of_stock";
      const price = Number(product.price);
      const promo = product.promoPrice == null ? null : Number(product.promoPrice);
      const salePrice = promo != null && promo > 0 && promo < price ? promo : null;
      const description =
        product.description?.trim() ||
        `${product.name} da ${product.brand}. Disponível no catálogo da Sra Make Prudente em Presidente Prudente/SP.`;
      const gtin = validGtin(product.sku);
      const productUrl = `${SITE_URL}/produto/${product.id}`;
      const color = inferColor(product.name, product.description);
      const audience = inferAudience(product.name, product.brand, product.category.name);

      return `
    <item>
      <g:id>${xml(product.id)}</g:id>
      <g:title>${xml(`${product.name} - ${product.brand}`)}</g:title>
      <g:description>${xml(description)}</g:description>
      <g:link>${xml(productUrl)}</g:link>
      <g:image_link>${xml(imageUrls[0])}</g:image_link>
      ${imageUrls.slice(1, 10).map((url) => `<g:additional_image_link>${xml(url)}</g:additional_image_link>`).join("\n      ")}
      <g:availability>${availability}</g:availability>
      <g:price>${price.toFixed(2)} BRL</g:price>
      ${salePrice != null ? `<g:sale_price>${salePrice.toFixed(2)} BRL</g:sale_price>` : ""}
      <g:condition>new</g:condition>
      <g:brand>${xml(product.brand)}</g:brand>
      ${gtin ? `<g:gtin>${gtin}</g:gtin>` : ""}
      ${color ? `<g:color>${xml(color)}</g:color>` : ""}
      <g:gender>${audience.gender}</g:gender>
      <g:age_group>${audience.ageGroup}</g:age_group>
      <g:product_type>${xml(product.category.name)}</g:product_type>
    </item>`;
    })
    .filter((item): item is string => Boolean(item))
    .join("");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Sra Make Prudente</title>
    <link>${SITE_URL}</link>
    <description>Catálogo de maquiagem, cosméticos, lash, nail e acessórios da Sra Make Prudente.</description>${items}
  </channel>
</rss>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
