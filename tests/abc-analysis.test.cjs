const test = require("node:test");
const assert = require("node:assert/strict");

const {
  abcHref,
  buildAbcRows,
  classifyCurve,
  coverageDaysOf,
  filterRows,
  matchesQuery,
  nextLimit,
  normalizeSearch,
  parseAbcParams,
  periodLengthDays,
  seoGaps,
} = require("../.tmp-tests/abc-analysis.js");

function product(overrides = {}) {
  return {
    productId: "p1",
    name: "Cílios Tufinho 40p do número 9 ao 14",
    brand: "New show",
    sku: "7890000000001",
    categorySlug: "cilios",
    categoryName: "Cílios",
    units: 10,
    revenue: 100,
    orders: 5,
    stockQty: 50,
    views: 100,
    carts: 20,
    inCatalog: true,
    hasRecord: true,
    gaps: [],
    ...overrides,
  };
}

test("o produto que cruza os 80% continua na curva A", () => {
  assert.equal(classifyCurve(0), "A");
  assert.equal(classifyCurve(79.9), "A");
  assert.equal(classifyCurve(80), "B");
  assert.equal(classifyCurve(94.9), "B");
  assert.equal(classifyCurve(95), "C");
});

test("ordena pela métrica, acumula a participação e classifica A/B/C", () => {
  const sold = [
    product({ productId: "c", name: "C", revenue: 5, units: 1 }),
    product({ productId: "a", name: "A", revenue: 70, units: 7 }),
    product({ productId: "b", name: "B", revenue: 20, units: 2 }),
    product({ productId: "d", name: "D", revenue: 5, units: 1 }),
  ];

  const rows = buildAbcRows(sold, "revenue", 30);

  assert.deepEqual(rows.map((row) => row.productId), ["a", "b", "c", "d"]);
  assert.deepEqual(rows.map((row) => row.rank), [1, 2, 3, 4]);
  assert.deepEqual(rows.map((row) => row.curve), ["A", "A", "B", "C"]);
  assert.equal(Math.round(rows[3].cumulative), 100);
});

test("ignora produtos sem unidade e sem faturamento", () => {
  const rows = buildAbcRows(
    [product({ units: 0, revenue: 0 }), product({ productId: "ok" })],
    "quantity",
    30
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].productId, "ok");
});

test("busca ignora acento, caixa e exige todas as palavras", () => {
  assert.equal(normalizeSearch("  CÍLIOS   Tufinho! "), "cilios tufinho");

  const item = product();
  assert.equal(matchesQuery(item, "cilios tufinho"), true);
  assert.equal(matchesQuery(item, "new show 14"), true);
  assert.equal(matchesQuery(item, "7890000000001"), true);
  assert.equal(matchesQuery(item, "cilios cola"), false);
  assert.equal(matchesQuery(item, "   "), true);
});

test("calcula cobertura de estoque pelo ritmo do período", () => {
  // 30 un em 30 dias = 1 un/dia; 4 em estoque dura 4 dias.
  assert.equal(coverageDaysOf(4, 30, 30), 4);
  assert.equal(coverageDaysOf(0, 30, 30), 0);
  assert.equal(coverageDaysOf(10, 0, 30), null);
});

test("sinais: ruptura e reposição só para curvas A e B", () => {
  const rows = buildAbcRows(
    [
      product({ productId: "zerado", name: "Zerado", revenue: 80, units: 8, stockQty: 0 }),
      product({ productId: "acabando", name: "Acabando", revenue: 15, units: 30, stockQty: 3 }),
      product({ productId: "cauda", name: "Cauda", revenue: 5, units: 1, stockQty: 0 }),
    ],
    "revenue",
    30
  );
  const byId = Object.fromEntries(rows.map((row) => [row.productId, row]));

  assert.ok(byId.zerado.signals.includes("ruptura"));
  assert.ok(byId.acabando.signals.includes("reposicao"));
  assert.equal(byId.acabando.signals.includes("ruptura"), false);
  assert.equal(byId.cauda.curve, "C");
  assert.deepEqual(byId.cauda.signals, []);
});

test("sinais: conteúdo fraco, pouca vitrine e baixa conversão", () => {
  const rows = buildAbcRows(
    [
      product({
        productId: "sem-texto",
        name: "Sem texto",
        revenue: 90,
        units: 9,
        views: 3,
        gaps: seoGaps({ name: "Sem texto", description: null, sku: "1", images: [{ alt: "x" }] }),
      }),
      product({ productId: "trava", name: "Trava", revenue: 10, units: 1, orders: 1, views: 200 }),
    ],
    "revenue",
    30
  );
  const byId = Object.fromEntries(rows.map((row) => [row.productId, row]));

  assert.ok(byId["sem-texto"].signals.includes("conteudo"));
  assert.ok(byId["sem-texto"].signals.includes("vitrine"));
  assert.ok(byId.trava.signals.includes("conversao"));
  assert.equal(byId.trava.conversion, 0.5);
});

test("lacunas de SEO do cadastro", () => {
  const full = seoGaps({
    name: "Máscara para Cílios Define e Alonga",
    description: "x".repeat(120),
    sku: "123",
    images: [{ alt: "Máscara" }],
  });
  assert.deepEqual(full, []);

  const weak = seoGaps({ name: "Kit", description: "", sku: null, images: [] });
  assert.deepEqual(
    weak.map((gap) => gap.key).sort(),
    ["nome-curto", "sem-descricao", "sem-imagem", "sem-sku"]
  );

  const noAlt = seoGaps({
    name: "Cola Super Hair Bond",
    description: "x".repeat(120),
    sku: "1",
    images: [{ alt: "ok" }, { alt: " " }],
  });
  assert.deepEqual(noAlt.map((gap) => gap.key), ["sem-alt"]);

  const longName = seoGaps({
    name: "x".repeat(71),
    description: "x".repeat(120),
    sku: "1",
    images: [{ alt: "ok" }],
  });
  assert.deepEqual(longName.map((gap) => gap.key), ["nome-longo"]);
});

test("filtra por curva, categoria, sinal e texto combinados", () => {
  const rows = buildAbcRows(
    [
      product({ productId: "a", name: "Cola Hair Bond", categorySlug: "cola", categoryName: "Cola", revenue: 80, units: 8, stockQty: 0 }),
      product({ productId: "b", name: "Cílios Tufinho", revenue: 15, units: 15 }),
      product({ productId: "c", name: "Base Griffty", categorySlug: "base", categoryName: "Base", revenue: 5, units: 2 }),
    ],
    "revenue",
    30
  );
  const none = { curve: null, q: "", cat: null, signal: null };

  assert.equal(filterRows(rows, none).length, 3);
  assert.deepEqual(filterRows(rows, { ...none, curve: "A" }).map((r) => r.productId), ["a"]);
  assert.deepEqual(filterRows(rows, { ...none, cat: "base" }).map((r) => r.productId), ["c"]);
  assert.deepEqual(filterRows(rows, { ...none, signal: "ruptura" }).map((r) => r.productId), ["a"]);
  assert.deepEqual(filterRows(rows, { ...none, q: "cilios" }).map((r) => r.productId), ["b"]);
  assert.equal(filterRows(rows, { ...none, curve: "C", q: "cola" }).length, 0);
});

test("parâmetros inválidos voltam ao padrão", () => {
  const params = parseAbcParams({
    period: "10y",
    metric: "xyz",
    curve: "z",
    signal: "nada",
    limit: "7",
    q: "  cola  ",
  });
  assert.deepEqual(params, {
    period: "30d",
    metric: "revenue",
    curve: null,
    signal: null,
    cat: null,
    q: "cola",
    limit: 10,
  });

  const valid = parseAbcParams({ period: "all", metric: "quantity", curve: "b", limit: "all", cat: "cilios" });
  assert.equal(valid.period, "all");
  assert.equal(valid.metric, "quantity");
  assert.equal(valid.curve, "B");
  assert.equal(valid.limit, "all");
  assert.equal(valid.cat, "cilios");
});

test("links mantêm os filtros e um filtro novo volta ao início da lista", () => {
  const current = parseAbcParams({ period: "all", metric: "quantity", q: "cola", limit: "50" });

  assert.equal(
    abcHref(current, { curve: "A" }),
    "/admin/analise/abc?period=all&metric=quantity&curve=A&q=cola"
  );
  assert.equal(
    abcHref(current, { limit: 100 }),
    "/admin/analise/abc?period=all&metric=quantity&q=cola&limit=100"
  );
  assert.equal(
    abcHref(current, { q: "", curve: null }),
    "/admin/analise/abc?period=all&metric=quantity"
  );
});

test("avança a paginação até mostrar tudo", () => {
  assert.equal(nextLimit(10), 25);
  assert.equal(nextLimit(100), "all");
  assert.equal(nextLimit("all"), null);
});

test("dias do período", () => {
  const now = new Date("2026-11-03T12:00:00Z");
  const ctx = { dayOfMonth: 3, oldestSaleAt: new Date("2026-09-04T12:00:00Z"), now };
  assert.equal(periodLengthDays("7d", ctx), 7);
  assert.equal(periodLengthDays("30d", ctx), 30);
  assert.equal(periodLengthDays("month", ctx), 3);
  assert.equal(periodLengthDays("all", ctx), 60);
  assert.equal(periodLengthDays("all", { ...ctx, oldestSaleAt: null }), 30);
});
