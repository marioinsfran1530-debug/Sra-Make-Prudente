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
    .filter((product) => product.images.length > 0)
    .map((product) => {
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

      return `
    <item>
      <g:id>${xml(product.id)}</g:id>
      <g:title>${xml(`${product.name} - ${product.brand}`)}</g:title>
      <g:description>${xml(description)}</g:description>
      <g:link>${xml(productUrl)}</g:link>
      <g:image_link>${xml(product.images[0].url)}</g:image_link>
      ${product.images.slice(1, 10).map((image) => `<g:additional_image_link>${xml(image.url)}</g:additional_image_link>`).join("\n      ")}
      <g:availability>${availability}</g:availability>
      <g:price>${price.toFixed(2)} BRL</g:price>
      ${salePrice != null ? `<g:sale_price>${salePrice.toFixed(2)} BRL</g:sale_price>` : ""}
      <g:condition>new</g:condition>
      <g:brand>${xml(product.brand)}</g:brand>
      ${gtin ? `<g:gtin>${gtin}</g:gtin>` : ""}
      <g:product_type>${xml(product.category.name)}</g:product_type>
    </item>`;
    })
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
