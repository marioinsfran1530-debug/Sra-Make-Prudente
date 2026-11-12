const test = require("node:test");
const assert = require("node:assert/strict");
const { createSlugIndex } = require("../.tmp-tests/slug-index.js");

function setup(initial) {
  let t = 0;
  let items = initial;
  let loads = 0;
  const index = createSlugIndex({
    load: async () => { loads += 1; return items; },
    slugOf: (item) => item.slug,
    ttlMs: 300_000,
    missRefreshMs: 30_000,
    now: () => t,
  });
  return {
    index,
    advance: (ms) => { t += ms; },
    setItems: (next) => { items = next; },
    loads: () => loads,
  };
}

test("acha pelo endereço lendo a lista uma vez só", async () => {
  const s = setup([{ id: "1", slug: "a" }, { id: "2", slug: "b" }]);
  assert.equal((await s.index.find("a")).id, "1");
  assert.equal((await s.index.find("b")).id, "2");
  assert.equal((await s.index.find("a")).id, "1");
  assert.equal(s.loads(), 1);
});

test("endereço inexistente não relê a lista dentro do intervalo", async () => {
  const s = setup([{ id: "1", slug: "a" }]);
  await s.index.find("a");
  for (let i = 0; i < 20; i += 1) assert.equal(await s.index.find(`robo-${i}`), null);
  assert.equal(s.loads(), 1);
});

test("produto novo é achado depois do intervalo de releitura", async () => {
  const s = setup([{ id: "1", slug: "a" }]);
  await s.index.find("a");
  s.setItems([{ id: "1", slug: "a" }, { id: "2", slug: "novo" }]);
  assert.equal(await s.index.find("novo"), null);
  s.advance(30_000);
  assert.equal((await s.index.find("novo")).id, "2");
  assert.equal(s.loads(), 2);
});

test("dois produtos com o mesmo endereço: vale o primeiro", async () => {
  const s = setup([{ id: "1", slug: "x" }, { id: "2", slug: "x" }]);
  assert.equal((await s.index.find("x")).id, "1");
});

test("a lista é relida depois do prazo", async () => {
  const s = setup([{ id: "1", slug: "a" }]);
  await s.index.find("a");
  s.advance(300_000);
  s.setItems([{ id: "9", slug: "a" }]);
  assert.equal((await s.index.find("a")).id, "9");
  assert.equal(s.loads(), 2);
});
