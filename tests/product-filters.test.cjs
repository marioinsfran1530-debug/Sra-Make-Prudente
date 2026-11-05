const test = require("node:test");
const assert = require("node:assert/strict");

const {
  EMPTY_FILTERS,
  PRICE_PRESETS,
  activeFilterCount,
  applyFilters,
  effectivePrice,
  facetCounts,
  filterProducts,
  filtersToParams,
  isOnPromo,
  parseFilters,
  presetOf,
  priceLabel,
  sanitizeFilters,
  sortProducts,
} = require("../.tmp-tests/product-filters.js");

function item(id, extra = {}) {
  return {
    id,
    brand: "Vivai",
    price: 30,
    promoPrice: null,
    stock: "DISPONIVEL",
    featured: false,
    isNew: false,
    bestSeller: false,
    subcategory: null,
    ...extra,
  };
}

const ids = (list) => list.map((product) => product.id);
const params = (query) => new URLSearchParams(query);

const CATALOG = [
  item("a", { brand: "Vivai", price: 20, subcategory: { slug: "batom" } }),
  item("b", { brand: "Ruby Rose", price: 40, promoPrice: 30, subcategory: { slug: "batom" } }),
  item("c", { brand: "Ruby Rose", price: 60, subcategory: { slug: "base" }, bestSeller: true }),
  item("d", { brand: "Vivai", price: 120, stock: "INDISPONIVEL", subcategory: { slug: "base" }, isNew: true }),
  item("e", { brand: "Océane", price: 25, stock: "ULTIMAS" }),
];

test("preço efetivo usa a promoção quando existe", () => {
  assert.equal(effectivePrice(item("x", { price: 40, promoPrice: 30 })), 30);
  assert.equal(effectivePrice(item("x", { price: 40, promoPrice: 0 })), 40);
  assert.equal(effectivePrice(item("x", { price: 40 })), 40);
});

test("promoção só vale se for mais barata que o preço normal", () => {
  assert.equal(isOnPromo(item("x", { price: 40, promoPrice: 30 })), true);
  assert.equal(isOnPromo(item("x", { price: 40, promoPrice: 40 })), false);
  assert.equal(isOnPromo(item("x", { price: 40 })), false);
});

test("sem filtros devolve tudo na ordem original", () => {
  assert.deepEqual(ids(applyFilters(CATALOG, EMPTY_FILTERS)), ["a", "b", "c", "d", "e"]);
});

test("marcas de múltipla escolha somam (OU entre marcas)", () => {
  const state = { ...EMPTY_FILTERS, brands: ["Vivai", "Océane"] };
  assert.deepEqual(ids(filterProducts(CATALOG, state)), ["a", "d", "e"]);
});

test("faixa de preço usa o preço com promoção e inclui as pontas", () => {
  const state = { ...EMPTY_FILTERS, minPrice: 25, maxPrice: 40 };
  // b custa 30 em promoção; e custa 25 (ponta); a custa 20 (fora)
  assert.deepEqual(ids(filterProducts(CATALOG, state)), ["b", "e"]);
});

test("só em promoção e só disponíveis", () => {
  assert.deepEqual(ids(filterProducts(CATALOG, { ...EMPTY_FILTERS, onlyPromo: true })), ["b"]);
  assert.deepEqual(ids(filterProducts(CATALOG, { ...EMPTY_FILTERS, onlyInStock: true })), ["a", "b", "c", "e"]);
});

test("subcategoria filtra pelo slug", () => {
  assert.deepEqual(ids(filterProducts(CATALOG, { ...EMPTY_FILTERS, sub: "base" })), ["c", "d"]);
});

test("ordenar por preço mantém indisponíveis por último", () => {
  assert.deepEqual(ids(sortProducts(CATALOG, "price-asc")), ["a", "e", "b", "c", "d"]);
  assert.deepEqual(ids(sortProducts(CATALOG, "price-desc")), ["c", "b", "e", "a", "d"]);
});

test("mais vendidos e novidades sobem primeiro, empate segue a ordem original", () => {
  assert.deepEqual(ids(sortProducts(CATALOG, "best")), ["c", "a", "b", "e", "d"]);
  // d é novidade mas está indisponível: vai por último mesmo assim.
  assert.deepEqual(ids(sortProducts(CATALOG, "new")), ["a", "b", "c", "e", "d"]);
});

test("ordenar não altera a lista original", () => {
  const copy = [...CATALOG];
  sortProducts(CATALOG, "price-desc");
  assert.deepEqual(CATALOG, copy);
});

test("contagem de marcas ignora o próprio filtro de marca, mas respeita os outros", () => {
  const state = { ...EMPTY_FILTERS, brands: ["Vivai"], onlyInStock: true };
  const counts = facetCounts(CATALOG, state);
  // Marca ignorada, estoque aplicado: a, b, c, e (d é indisponível)
  assert.equal(counts.brands.get("Vivai"), 1);
  assert.equal(counts.brands.get("Ruby Rose"), 2);
  assert.equal(counts.brands.get("Océane"), 1);
});

test("contagem de subcategorias respeita a marca escolhida", () => {
  const counts = facetCounts(CATALOG, { ...EMPTY_FILTERS, brands: ["Ruby Rose"] });
  assert.equal(counts.subcategories.get("batom"), 1);
  assert.equal(counts.subcategories.get("base"), 1);
});

test("contagem de faixas, promoção e disponíveis", () => {
  const counts = facetCounts(CATALOG, EMPTY_FILTERS);
  assert.equal(counts.presets.get("ate-25"), 2); // a (20) e e (25)
  assert.equal(counts.presets.get("25-50"), 2); // e (25, ponta) e b (30)
  assert.equal(counts.presets.get("50-100"), 1); // só c (60)
  assert.equal(counts.presets.get("100-mais"), 1); // d (120)
  assert.equal(counts.promo, 1);
  assert.equal(counts.inStock, 4);
  assert.equal(counts.priceMin, 20);
  assert.equal(counts.priceMax, 120);
});

test("contagem de lista vazia não quebra", () => {
  const counts = facetCounts([], EMPTY_FILTERS);
  assert.equal(counts.priceMin, 0);
  assert.equal(counts.priceMax, 0);
  assert.equal(counts.promo, 0);
});

test("contagem de filtros ativos não inclui subcategoria nem ordem", () => {
  assert.equal(activeFilterCount(EMPTY_FILTERS), 0);
  assert.equal(
    activeFilterCount({
      ...EMPTY_FILTERS,
      sub: "base",
      sort: "price-asc",
      brands: ["Vivai", "Océane"],
      minPrice: 10,
      onlyPromo: true,
    }),
    4
  );
});

test("faixa pronta é reconhecida pelos limites", () => {
  assert.equal(presetOf({ minPrice: 25, maxPrice: 50 })?.key, "25-50");
  assert.equal(presetOf({ minPrice: null, maxPrice: 25 })?.key, "ate-25");
  assert.equal(presetOf({ minPrice: 30, maxPrice: 50 }), null);
  assert.equal(PRICE_PRESETS.length, 4);
});

test("endereço: lê e escreve os filtros sem perder nada", () => {
  const state = {
    sub: "batom",
    brands: ["Ruby Rose", "Océane"],
    minPrice: 10.5,
    maxPrice: 80,
    onlyPromo: true,
    onlyInStock: true,
    sort: "price-asc",
  };
  const query = new URLSearchParams(filtersToParams(state));
  assert.deepEqual(parseFilters(query), state);
});

test("endereço: filtros vazios não geram parâmetros", () => {
  assert.deepEqual(filtersToParams(EMPTY_FILTERS), {});
  assert.deepEqual(parseFilters(params("")), EMPTY_FILTERS);
});

test("endereço: link antigo só com subcategoria continua funcionando", () => {
  assert.equal(parseFilters(params("subcategoria=base")).sub, "base");
});

test("endereço: valores inválidos são ignorados", () => {
  const state = parseFilters(params("ordem=banana&min=abc&max=-5&promo=0&marcas=,,"));
  assert.deepEqual(state, EMPTY_FILTERS);
});

test("endereço: mínimo maior que máximo é invertido", () => {
  const state = parseFilters(params("min=90&max=30"));
  assert.equal(state.minPrice, 30);
  assert.equal(state.maxPrice, 90);
});

test("endereço: vírgula decimal é aceita", () => {
  assert.equal(parseFilters(params("max=19,9")).maxPrice, 19.9);
});

test("sanitizar remove marca e subcategoria que não existem na listagem", () => {
  const state = { ...EMPTY_FILTERS, sub: "fantasma", brands: ["Vivai", "Inexistente"] };
  const clean = sanitizeFilters(state, ["Vivai", "Ruby Rose"], ["batom", "base"]);
  assert.equal(clean.sub, "all");
  assert.deepEqual(clean.brands, ["Vivai"]);
});

test("rótulo de preço", () => {
  assert.equal(priceLabel(null, 25), "Até R$ 25");
  assert.equal(priceLabel(100, null), "A partir de R$ 100");
  assert.equal(priceLabel(25.5, 50), "R$ 25,5 a R$ 50");
  assert.equal(priceLabel(null, null), "Qualquer preço");
});
