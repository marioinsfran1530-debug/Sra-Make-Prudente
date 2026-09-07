export type ProductSlugSource = {
  name: string;
  brand?: string | null;
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
