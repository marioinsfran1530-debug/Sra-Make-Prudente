// Filtros e ordenação da listagem de produtos da loja (lógica pura, sem React),
// para poder ser testada. Segue o padrão das lojas online:
//  - marcas de múltipla escolha, faixa de preço (mínimo/máximo), "em promoção",
//    "só disponíveis" e ordenação;
//  - cada opção mostra quantos produtos traz JÁ considerando os outros filtros
//    (contagem "facetada"), e as opções que dariam zero ficam esmaecidas.

export type FilterableProduct = {
  id: string;
  brand: string;
  price: number;
  promoPrice: number | null;
  stock: "DISPONIVEL" | "ULTIMAS" | "INDISPONIVEL";
  featured: boolean;
  isNew: boolean;
  bestSeller: boolean;
  subcategory: { slug: string } | null;
};

export type SortKey = "relevance" | "price-asc" | "price-desc" | "best" | "new";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "relevance", label: "Relevância" },
  { key: "price-asc", label: "Menor preço" },
  { key: "price-desc", label: "Maior preço" },
  { key: "best", label: "Mais vendidos" },
  { key: "new", label: "Novidades" },
];

export type FilterState = {
  sub: string; // "all" ou slug da subcategoria
  brands: string[];
  minPrice: number | null;
  maxPrice: number | null;
  onlyPromo: boolean;
  onlyInStock: boolean;
  sort: SortKey;
};

export const EMPTY_FILTERS: FilterState = {
  sub: "all",
  brands: [],
  minPrice: null,
  maxPrice: null,
  onlyPromo: false,
  onlyInStock: false,
  sort: "relevance",
};

// Preço que o cliente de fato paga (mesma regra do card do produto).
export function effectivePrice(product: Pick<FilterableProduct, "price" | "promoPrice">) {
  return product.promoPrice ? product.promoPrice : product.price;
}

export function isOnPromo(product: Pick<FilterableProduct, "price" | "promoPrice">) {
  return Boolean(product.promoPrice) && (product.promoPrice as number) < product.price;
}

export function isAvailable(product: Pick<FilterableProduct, "stock">) {
  return product.stock !== "INDISPONIVEL";
}

// Faixas prontas de preço. Só aparecem as que têm produto.
export type PricePreset = { key: string; label: string; min: number | null; max: number | null };

export const PRICE_PRESETS: PricePreset[] = [
  { key: "ate-25", label: "Até R$ 25", min: null, max: 25 },
  { key: "25-50", label: "R$ 25 a R$ 50", min: 25, max: 50 },
  { key: "50-100", label: "R$ 50 a R$ 100", min: 50, max: 100 },
  { key: "100-mais", label: "Acima de R$ 100", min: 100, max: null },
];

export function presetOf(state: Pick<FilterState, "minPrice" | "maxPrice">) {
  return PRICE_PRESETS.find((preset) => preset.min === state.minPrice && preset.max === state.maxPrice) ?? null;
}

function inPriceRange(price: number, min: number | null, max: number | null) {
  // Centavos: "R$ 25" entra tanto em "até 25" quanto em "25 a 50".
  if (min !== null && price < min) return false;
  if (max !== null && price > max) return false;
  return true;
}

type Facet = "sub" | "brands" | "price" | "promo" | "stock";

// Aplica os filtros, pulando os de `skip` (usado para contar cada opção).
function matches(product: FilterableProduct, state: FilterState, skip: Facet | null) {
  if (skip !== "sub" && state.sub !== "all" && product.subcategory?.slug !== state.sub) return false;
  if (skip !== "brands" && state.brands.length > 0 && !state.brands.includes(product.brand)) return false;
  if (skip !== "price" && !inPriceRange(effectivePrice(product), state.minPrice, state.maxPrice)) return false;
  if (skip !== "promo" && state.onlyPromo && !isOnPromo(product)) return false;
  if (skip !== "stock" && state.onlyInStock && !isAvailable(product)) return false;
  return true;
}

export function filterProducts<T extends FilterableProduct>(products: T[], state: FilterState): T[] {
  return products.filter((product) => matches(product, state, null));
}

// Ordenação estável: a ordem original do servidor (destaques, mais vendidos,
// novidades) desempata e é a "Relevância".
export function sortProducts<T extends FilterableProduct>(products: T[], sort: SortKey): T[] {
  if (sort === "relevance") return products;

  const indexed = products.map((product, index) => ({ product, index }));
  const flag = (value: boolean) => (value ? 1 : 0);

  indexed.sort((a, b) => {
    // Indisponíveis sempre por último, em qualquer ordenação.
    const availability = flag(isAvailable(b.product)) - flag(isAvailable(a.product));
    if (availability !== 0) return availability;

    let diff = 0;
    if (sort === "price-asc") diff = effectivePrice(a.product) - effectivePrice(b.product);
    if (sort === "price-desc") diff = effectivePrice(b.product) - effectivePrice(a.product);
    if (sort === "best") diff = flag(b.product.bestSeller) - flag(a.product.bestSeller);
    if (sort === "new") diff = flag(b.product.isNew) - flag(a.product.isNew);

    return diff || a.index - b.index;
  });

  return indexed.map(({ product }) => product);
}

export function applyFilters<T extends FilterableProduct>(products: T[], state: FilterState): T[] {
  return sortProducts(filterProducts(products, state), state.sort);
}

export type FacetCounts = {
  brands: Map<string, number>;
  subcategories: Map<string, number>;
  presets: Map<string, number>;
  promo: number;
  inStock: number;
  // Menor e maior preço entre os produtos da categoria (para os campos de preço).
  priceMin: number;
  priceMax: number;
};

export function facetCounts(products: FilterableProduct[], state: FilterState): FacetCounts {
  const brands = new Map<string, number>();
  const subcategories = new Map<string, number>();
  const presets = new Map<string, number>(PRICE_PRESETS.map((preset) => [preset.key, 0]));
  let promo = 0;
  let inStock = 0;
  let priceMin = Infinity;
  let priceMax = 0;

  for (const product of products) {
    const price = effectivePrice(product);
    priceMin = Math.min(priceMin, price);
    priceMax = Math.max(priceMax, price);

    if (matches(product, state, "brands")) {
      brands.set(product.brand, (brands.get(product.brand) ?? 0) + 1);
    }
    if (matches(product, state, "sub") && product.subcategory) {
      const slug = product.subcategory.slug;
      subcategories.set(slug, (subcategories.get(slug) ?? 0) + 1);
    }
    if (matches(product, state, "price")) {
      for (const preset of PRICE_PRESETS) {
        if (inPriceRange(price, preset.min, preset.max)) {
          presets.set(preset.key, (presets.get(preset.key) ?? 0) + 1);
        }
      }
    }
    if (matches(product, state, "promo") && isOnPromo(product)) promo += 1;
    if (matches(product, state, "stock") && isAvailable(product)) inStock += 1;
  }

  return {
    brands,
    subcategories,
    presets,
    promo,
    inStock,
    priceMin: Number.isFinite(priceMin) ? priceMin : 0,
    priceMax,
  };
}

// Quantidade de filtros ativos (sem contar subcategoria e ordenação, que ficam
// visíveis fora do painel).
export function activeFilterCount(state: FilterState) {
  return (
    state.brands.length +
    (state.minPrice !== null || state.maxPrice !== null ? 1 : 0) +
    (state.onlyPromo ? 1 : 0) +
    (state.onlyInStock ? 1 : 0)
  );
}

// ---- Endereço (URL) ----------------------------------------------------
// Os filtros vão para o endereço para que o botão "voltar" do celular e o link
// compartilhado preservem a seleção. A subcategoria continua em ?subcategoria=
// (já usada pelo menu), então links antigos seguem funcionando.

const SORT_KEYS = new Set<string>(SORT_OPTIONS.map((option) => option.key));

function parsePrice(value: string | null) {
  if (value === null || value.trim() === "") return null;
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function parseFilters(params: { get(name: string): string | null }): FilterState {
  const sortParam = params.get("ordem");
  const brandsParam = params.get("marcas");

  let minPrice = parsePrice(params.get("min"));
  let maxPrice = parsePrice(params.get("max"));
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  return {
    sub: params.get("subcategoria") || "all",
    brands: brandsParam ? brandsParam.split(",").map((brand) => brand.trim()).filter(Boolean) : [],
    minPrice,
    maxPrice,
    onlyPromo: params.get("promo") === "1",
    onlyInStock: params.get("estoque") === "1",
    sort: sortParam && SORT_KEYS.has(sortParam) ? (sortParam as SortKey) : "relevance",
  };
}

// Mantém só marcas que existem de fato nesta listagem (link antigo ou digitado).
export function sanitizeFilters(state: FilterState, brands: string[], subSlugs: string[]): FilterState {
  return {
    ...state,
    sub: state.sub === "all" || subSlugs.includes(state.sub) ? state.sub : "all",
    brands: state.brands.filter((brand) => brands.includes(brand)),
  };
}

function formatPrice(value: number) {
  return String(Math.round(value * 100) / 100);
}

// Devolve só os parâmetros dos filtros; quem chama junta com os demais do endereço.
export function filtersToParams(state: FilterState): Record<string, string> {
  const out: Record<string, string> = {};
  if (state.sub !== "all") out.subcategoria = state.sub;
  if (state.brands.length > 0) out.marcas = state.brands.join(",");
  if (state.minPrice !== null) out.min = formatPrice(state.minPrice);
  if (state.maxPrice !== null) out.max = formatPrice(state.maxPrice);
  if (state.onlyPromo) out.promo = "1";
  if (state.onlyInStock) out.estoque = "1";
  if (state.sort !== "relevance") out.ordem = state.sort;
  return out;
}

export const FILTER_PARAM_NAMES = ["subcategoria", "marcas", "min", "max", "promo", "estoque", "ordem"] as const;

export function priceLabel(min: number | null, max: number | null) {
  const money = (value: number) => `R$ ${formatPrice(value).replace(".", ",")}`;
  if (min !== null && max !== null) return `${money(min)} a ${money(max)}`;
  if (min !== null) return `A partir de ${money(min)}`;
  if (max !== null) return `Até ${money(max)}`;
  return "Qualquer preço";
}
