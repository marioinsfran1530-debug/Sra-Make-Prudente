const test = require("node:test");
const assert = require("node:assert/strict");
const { groupByProduct, insertAfterProduct } = require("../.tmp-tests/stock-entry-pick.js");

const item = (productId, variant) => ({ productId, key: `${productId}:${variant ?? "base"}` });

test("agrupa por produto mantendo a ordem da primeira aparição", () => {
  const { groups, totalProducts } = groupByProduct(
    [item("a", "1"), item("b", null), item("a", "2"), item("c", "1"), item("a", "3")],
    10
  );
  assert.equal(totalProducts, 3);
  assert.deepEqual(groups.map((group) => group.productId), ["a", "b", "c"]);
  assert.deepEqual(groups[0].items.map((entry) => entry.key), ["a:1", "a:2", "a:3"]);
});

test("o limite conta produtos, não variações", () => {
  const items = [item("a", "1"), item("a", "2"), item("a", "3"), item("a", "4"), item("b", null), item("c", null)];
  const { groups, totalProducts } = groupByProduct(items, 2);
  assert.equal(totalProducts, 3);
  assert.deepEqual(groups.map((group) => group.productId), ["a", "b"]);
  assert.equal(groups[0].items.length, 4);
});

test("lista vazia e limite zero", () => {
  assert.deepEqual(groupByProduct([], 5), { groups: [], totalProducts: 0 });
  assert.deepEqual(groupByProduct([item("a", null)], 0).groups, []);
  assert.equal(groupByProduct([item("a", null)], 0).totalProducts, 1);
});

test("nova variação entra depois da última linha do mesmo produto", () => {
  const lines = [item("a", "1"), item("b", null), item("a", "2"), item("c", null)];
  const result = insertAfterProduct(lines, [item("a", "3")]);
  assert.deepEqual(result.map((line) => line.key), ["a:1", "b:base", "a:2", "a:3", "c:base"]);
});

test("produto novo na entrada vai para o fim; várias linhas mantêm a ordem", () => {
  const lines = [item("a", "1")];
  const result = insertAfterProduct(lines, [item("b", "1"), item("b", "2")]);
  assert.deepEqual(result.map((line) => line.key), ["a:1", "b:1", "b:2"]);
});

test("não altera a lista original e aceita nada a adicionar", () => {
  const lines = [item("a", "1")];
  const same = insertAfterProduct(lines, []);
  assert.deepEqual(same, lines);
  assert.notEqual(same, lines);
  insertAfterProduct(lines, [item("a", "2")]);
  assert.equal(lines.length, 1);
});
