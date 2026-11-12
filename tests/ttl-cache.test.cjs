const test = require("node:test");
const assert = require("node:assert/strict");
const { createTtlCache } = require("../.tmp-tests/ttl-cache.js");

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

test("reaproveita o valor dentro do prazo e relê depois dele", async () => {
  const c = clock();
  let calls = 0;
  const cache = createTtlCache(async () => ++calls, 1000, c.now);
  assert.equal(await cache.get(), 1);
  c.advance(999);
  assert.equal(await cache.get(), 1);
  c.advance(1);
  assert.equal(await cache.get(), 2);
  assert.equal(calls, 2);
});

test("visitas ao mesmo tempo esperam uma única consulta", async () => {
  const c = clock();
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const cache = createTtlCache(async () => { calls += 1; await gate; return "ok"; }, 1000, c.now);
  const all = Promise.all([cache.get(), cache.get(), cache.get()]);
  release();
  assert.deepEqual(await all, ["ok", "ok", "ok"]);
  assert.equal(calls, 1);
});

test("clear força uma nova leitura", async () => {
  const c = clock();
  let calls = 0;
  const cache = createTtlCache(async () => ++calls, 1000, c.now);
  await cache.get();
  cache.clear();
  assert.equal(await cache.get(), 2);
});

test("se a leitura falhar, usa o último valor; sem valor, propaga o erro", async () => {
  const c = clock();
  let fail = false;
  let calls = 0;
  const cache = createTtlCache(async () => {
    calls += 1;
    if (fail) throw new Error("banco fora");
    return "velho";
  }, 1000, c.now);
  await assert.rejects(async () => { fail = true; await cache.get(); }, /banco fora/);
  fail = false;
  assert.equal(await cache.get(), "velho");
  c.advance(5000);
  fail = true;
  assert.equal(await cache.get(), "velho");
  assert.equal(calls, 3);
});
