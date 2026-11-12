const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPopularitySignals } = require("../.tmp-tests/home-popularity.js");

test("soma sessões distintas com o peso de cada evento", () => {
  const signals = buildPopularitySignals(
    [
      { productId: "a", event: "product_view", sessions: 4 },
      { productId: "a", event: "whatsapp_click", sessions: 2 },
      { productId: "b", event: "add_to_cart", sessions: 1 },
    ],
    6
  );
  assert.equal(signals.scores.get("a"), 4 * 1 + 2 * 3);
  assert.equal(signals.scores.get("b"), 4);
  assert.equal(signals.totalSignals, 7);
  assert.equal(signals.uniqueSessions, 6);
  assert.equal(signals.enoughData, false);
});

test("dados suficientes: 5 sessões e 8 sinais", () => {
  const rows = [{ productId: "a", event: "product_view", sessions: 8 }];
  assert.equal(buildPopularitySignals(rows, 5).enoughData, true);
  assert.equal(buildPopularitySignals(rows, 4).enoughData, false);
  assert.equal(buildPopularitySignals([{ productId: "a", event: "product_view", sessions: 7 }], 9).enoughData, false);
});

test("aceita bigint e texto vindos do banco; ignora linhas inválidas", () => {
  const signals = buildPopularitySignals(
    [
      { productId: "a", event: "product_view", sessions: 3n },
      { productId: "a", event: "add_to_cart", sessions: "2" },
      { productId: "", event: "product_view", sessions: 5 },
      { productId: "b", event: "product_view", sessions: 0 },
    ],
    10n
  );
  assert.equal(signals.scores.get("a"), 3 + 2 * 4);
  assert.equal(signals.scores.has("b"), false);
  assert.equal(signals.totalSignals, 5);
  assert.equal(signals.uniqueSessions, 10);
});

test("sem linhas: sem dados e mapa vazio", () => {
  const signals = buildPopularitySignals([], 0);
  assert.equal(signals.enoughData, false);
  assert.equal(signals.scores.size, 0);
});
