const test = require("node:test");
const assert = require("node:assert/strict");

const { MIN_MARGIN_PCT, marginPct, priceAdvice, roundToNinety, suggestedPrice } = require("../.tmp-tests/pricing.js");

test("arredonda para o ,90 mais próximo", () => {
  assert.equal(roundToNinety(31.82), 31.9);
  assert.equal(roundToNinety(31.4), 31.9);
  assert.equal(roundToNinety(31.0), 30.9);
  assert.equal(roundToNinety(31.5), 31.9);
  assert.equal(roundToNinety(31.9), 31.9);
  assert.equal(roundToNinety(0.3), 0.9);
  assert.equal(roundToNinety(100), 99.9);
  assert.equal(roundToNinety(0), 0.9);
  assert.equal(roundToNinety(NaN), 0.9);
});

test("preço sugerido segue a regra da loja (custo ÷ 0,44) terminando em ,90", () => {
  assert.equal(suggestedPrice(14), 31.9); // 31,82
  assert.equal(suggestedPrice(10), 22.9); // 22,73
  assert.equal(suggestedPrice(5), 10.9); // 11,36: o ,90 mais próximo é 10,90 (margem 54%)
  assert.equal(suggestedPrice(20), 45.9); // 45,45
});

test("o preço sugerido nunca fica abaixo da margem mínima", () => {
  for (let cost = 0.5; cost <= 500; cost += 0.37) {
    const price = suggestedPrice(cost);
    assert.ok(marginPct(price, cost) >= MIN_MARGIN_PCT, `custo ${cost} → ${price}`);
    assert.equal(Math.round(price * 100) % 100, 90, `custo ${cost} → ${price} não termina em ,90`);
  }
});

test("sem custo válido não há sugestão", () => {
  assert.equal(suggestedPrice(0), null);
  assert.equal(suggestedPrice(-1), null);
  assert.equal(suggestedPrice(NaN), null);
});

test("conselho: margem boa não é marcada como baixa", () => {
  const ok = priceAdvice(31.9, 14); // margem ≈ 56%
  assert.equal(ok.low, false);
  assert.equal(Math.round(ok.margin), 56);
});

test("conselho: margem baixa traz sugestão com margem melhor", () => {
  const low = priceAdvice(29.9, 18); // margem ≈ 40%
  assert.equal(low.low, true);
  assert.equal(low.suggested, 40.9);
  assert.ok(low.suggestedMargin >= MIN_MARGIN_PCT);
});

test("conselho: preço zerado conta como margem baixa", () => {
  assert.equal(priceAdvice(0, 10).low, true);
});
