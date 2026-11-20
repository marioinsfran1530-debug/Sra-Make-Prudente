const test = require("node:test");
const assert = require("node:assert/strict");
const { pickRelated } = require("../.tmp-tests/related-products.js");

function p(id, extra = {}) {
  return {
    id,
    stock: "DISPONIVEL",
    bestSeller: false,
    category: { id: "c1" },
    categories: [],
    subcategory: null,
    ...extra,
  };
}

test("comprados juntos vêm na ordem do banco e ignoram o próprio produto, inativos e sem estoque", () => {
  const catalog = [p("a"), p("b"), p("c", { stock: "INDISPONIVEL" }), p("d")];
  const result = pickRelated(catalog[0], ["a", "c", "zzz", "d", "b", "d"], catalog);
  assert.deepEqual(result.together.map((x) => x.id), ["d", "b"]);
});

test("limita os comprados juntos e completa o resto com a mesma categoria até o total", () => {
  const catalog = [p("a")];
  for (let i = 0; i < 12; i += 1) catalog.push(p(`s${i}`));
  const result = pickRelated(catalog[0], ["s0", "s1", "s2"], catalog, { togetherMax: 2, totalMax: 5, similarMax: 6 });
  assert.deepEqual(result.together.map((x) => x.id), ["s0", "s1"]);
  assert.equal(result.similar.length, 3); // total 5 - 2 juntos
  assert.ok(!result.similar.some((x) => ["a", "s0", "s1"].includes(x.id)));
});

test("sem histórico: só mesma categoria, subcategoria e mais vendidos primeiro", () => {
  const base = p("a", { subcategory: { id: "sub1" } });
  const catalog = [
    base,
    p("x", { category: { id: "c2" } }), // outra categoria: fora
    p("y"), // mesma categoria
    p("z", { bestSeller: true }), // mais vendido
    p("w", { subcategory: { id: "sub1" } }), // mesma subcategoria
    p("v", { categories: [{ id: "c1" }], category: { id: "c9" } }), // categoria extra em comum
  ];
  const result = pickRelated(base, [], catalog);
  assert.deepEqual(result.together, []);
  assert.deepEqual(result.similar.map((x) => x.id), ["w", "z", "y", "v"]);
});

test("nada para mostrar quando não há outros produtos", () => {
  const only = p("a");
  assert.deepEqual(pickRelated(only, ["a"], [only]), { together: [], similar: [] });
});
