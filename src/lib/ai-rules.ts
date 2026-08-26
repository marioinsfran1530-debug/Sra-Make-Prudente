export type AiCampaignReason =
  | "oferta"
  | "mais_vendido"
  | "novidade"
  | "destaque"
  | "catalogo";

type NumericLike = number | string | { toString(): string } | null | undefined;

export type AiCampaignFacts = {
  price: NumericLike;
  promoPrice: NumericLike;
  bestSeller: boolean;
  isNew: boolean;
  featured: boolean;
};

function numeric(value: NumericLike) {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(parsed) ? parsed : null;
}

export function classifyAiCampaignReason(product: AiCampaignFacts): AiCampaignReason {
  const price = numeric(product.price);
  const promoPrice = numeric(product.promoPrice);

  if (
    price !== null &&
    promoPrice !== null &&
    price > 0 &&
    promoPrice >= 0 &&
    promoPrice < price
  ) {
    return "oferta";
  }
  if (product.bestSeller) return "mais_vendido";
  if (product.isNew) return "novidade";
  if (product.featured) return "destaque";
  return "catalogo";
}
