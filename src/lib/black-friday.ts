// Campanha Black Friday 2026.
// O banner some sozinho depois do prazo. Para prorrogar, troque apenas
// BLACK_FRIDAY_ENDS_AT (e o texto em BLACK_FRIDAY_ENDS_LABEL).

export const BLACK_FRIDAY_PATH = "/ofertas-black";

// Domingo 29/11/2026, 23h59 no horário de Brasília (UTC-3).
export const BLACK_FRIDAY_ENDS_AT = "2026-11-29T23:59:59-03:00";
export const BLACK_FRIDAY_ENDS_LABEL = "domingo (29/11), às 23h59";

export function blackFridayMsLeft(
  now: number = Date.now(),
  endsAt: string = BLACK_FRIDAY_ENDS_AT,
): number {
  const end = Date.parse(endsAt);
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, end - now);
}

export function isBlackFridayActive(
  now: number = Date.now(),
  endsAt: string = BLACK_FRIDAY_ENDS_AT,
): boolean {
  return blackFridayMsLeft(now, endsAt) > 0;
}

export function splitCountdown(msLeft: number) {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

type PricedProduct = { price: number; promoPrice: number | null };

// Só conta como oferta quando o preço promocional é menor que o preço normal.
export function isOnOffer(product: PricedProduct): boolean {
  return (
    product.promoPrice !== null &&
    product.promoPrice > 0 &&
    product.promoPrice < product.price
  );
}

export function discountPercent(product: PricedProduct): number {
  if (!isOnOffer(product) || product.promoPrice === null || product.price <= 0) {
    return 0;
  }
  return Math.round((1 - product.promoPrice / product.price) * 100);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR");
}

// Combo = produto cadastrado no admin com "Combo" no nome (ex.: "Combo Olhos").
export function isComboProduct(product: { name: string }): boolean {
  return /\bcombos?\b/.test(normalizeText(product.name));
}

// Separa o que aparece na página Ofertas Black:
// - combos: produtos com "Combo" no nome (com ou sem desconto);
// - offers: qualquer outro produto com preço promocional, do maior desconto
//   para o menor.
export function splitBlackOffers<T extends PricedProduct & { name: string }>(
  products: readonly T[],
): { combos: T[]; offers: T[] } {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name, "pt-BR");

  const combos = products
    .filter((product) => isComboProduct(product))
    .sort((a, b) => discountPercent(b) - discountPercent(a) || byName(a, b));

  const offers = products
    .filter((product) => !isComboProduct(product) && isOnOffer(product))
    .sort(
      (a, b) =>
        discountPercent(b) - discountPercent(a) ||
        a.price - b.price ||
        byName(a, b),
    );

  return { combos, offers };
}
