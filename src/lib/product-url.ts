export type ProductSlugSource = {
  name: string;
  brand?: string | null;
};

// Mantém funcionando o endereço anterior quando um erro de digitação no nome
// do produto é corrigido. Como o slug ainda é derivado de nome + marca, esses
// aliases evitam transformar uma revisão de texto em link quebrado.
const LEGACY_PRODUCT_IDS_BY_SLUG: Readonly<Record<string, string>> = {
  "adesivos-coloridos-mod": "cmt67gjxw00013qp578wfh9ik",
  "batom-bastam-kyrav": "cmt1uqw2w000x5gylninxbnt6",
  "batom-bastam-powerful-lips": "cmt1uoikx000p5gyl3wy7ll1y",
  "bory-splash-bio-instinto": "cmt5xelhb0025cj2jp0mc9ee2",
  "cilios-posticos-cilios": "cmt5yxrxz003llkyk8x1butcd",
  "cilios-posticos-new": "cmt5yo6050022lkykwumd3mi5",
  "cilios-posticos-sabrina-sato": "cmt5ypy9f002ilkykcwqfp9uq",
  "mascara-para-cilios-define-e-alonga-hb500-rubyrose-5ml-ruby-rose":
    "cmt5t3psh0005pdjcw2igrdvf",
  "mimi-espelho-de-bancada-espelho": "cmt6b9aiw002f6fpp2n1ssjz0",
  "nessecer-variado": "cmt66povx000v4thr741j3s78",
  "paleta-de-sombras-t-e-g": "cmt37b2be0007121rtmd7aews",
  "unhas-posticas-infantil-infantil": "cmt65fsg5001u14lwckysp5pj",
  "unhas-posticas-unhas": "cmt64yt7i000p14lw0w3p08si",
};

export function slugifyProductText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function productSlug(product: ProductSlugSource) {
  const parts = [product.name, product.brand].filter(Boolean).join(" ");
  return slugifyProductText(parts);
}

export function productPath(product: ProductSlugSource) {
  return `/produto/${productSlug(product)}`;
}

export function findProductSlugConflict<
  T extends ProductSlugSource & { id: string },
>(
  product: ProductSlugSource,
  candidates: readonly T[],
  ignoredProductId?: string,
) {
  const slug = productSlug(product);

  return (
    candidates.find(
      (candidate) =>
        candidate.id !== ignoredProductId && productSlug(candidate) === slug,
    ) ?? null
  );
}

export function productIdFromLegacySlug(slug: string) {
  return LEGACY_PRODUCT_IDS_BY_SLUG[slug] ?? null;
}
