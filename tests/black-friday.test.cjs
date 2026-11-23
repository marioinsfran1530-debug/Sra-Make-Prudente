const test = require("node:test");
const assert = require("node:assert/strict");
const {
  BLACK_FRIDAY_ENDS_AT,
  blackFridayMsLeft,
  discountPercent,
  isBlackFridayActive,
  isComboProduct,
  isOnOffer,
  splitBlackOffers,
  splitCountdown,
} = require("../.tmp-tests/black-friday.js");

const at = (iso) => Date.parse(iso);

test("a Black Friday vale até domingo 29/11 às 23h59 no horário de Brasília", () => {
  assert.equal(BLACK_FRIDAY_ENDS_AT, "2026-11-29T23:59:59-03:00");
  assert.equal(isBlackFridayActive(at("2026-11-29T23:59:00-03:00")), true);
  assert.equal(isBlackFridayActive(at("2026-11-30T00:00:00-03:00")), false);
});

test("o tempo restante nunca fica negativo e data inválida encerra a campanha", () => {
  assert.equal(blackFridayMsLeft(at("2026-12-05T10:00:00-03:00")), 0);
  assert.equal(blackFridayMsLeft(at("2026-11-29T23:59:58-03:00")), 1000);
  assert.equal(blackFridayMsLeft(0, "data-invalida"), 0);
  assert.equal(isBlackFridayActive(0, "data-invalida"), false);
});

test("divide o tempo restante em dias, horas, minutos e segundos", () => {
  assert.deepEqual(splitCountdown(90061000), {
    days: 1,
    hours: 1,
    minutes: 1,
    seconds: 1,
  });
  assert.deepEqual(splitCountdown(-5), {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
});

test("só é oferta quando o preço promocional é menor que o normal", () => {
  assert.equal(isOnOffer({ price: 39.99, promoPrice: 31.99 }), true);
  assert.equal(isOnOffer({ price: 39.99, promoPrice: null }), false);
  assert.equal(isOnOffer({ price: 39.99, promoPrice: 39.99 }), false);
  assert.equal(isOnOffer({ price: 39.99, promoPrice: 45 }), false);
  assert.equal(isOnOffer({ price: 39.99, promoPrice: 0 }), false);
});

test("calcula o percentual de desconto arredondado", () => {
  assert.equal(discountPercent({ price: 39.99, promoPrice: 31.99 }), 20);
  assert.equal(discountPercent({ price: 39.99, promoPrice: 27.99 }), 30);
  assert.equal(discountPercent({ price: 39.99, promoPrice: null }), 0);
  assert.equal(discountPercent({ price: 0, promoPrice: 0 }), 0);
});

test("reconhece combo pelo nome, sem confundir com outras palavras", () => {
  assert.equal(isComboProduct({ name: "Combo Olhos" }), true);
  assert.equal(isComboProduct({ name: "COMBO rosto completo" }), true);
  assert.equal(isComboProduct({ name: "Combos de Natal" }), true);
  assert.equal(isComboProduct({ name: "Kit cola e cílios" }), false);
  assert.equal(isComboProduct({ name: "Pente combinado" }), false);
});

test("separa combos e ofertas e ordena pelo maior desconto", () => {
  const products = [
    { name: "Batom", price: 20, promoPrice: 18 },
    { name: "Combo Rosto", price: 100, promoPrice: 80 },
    { name: "Máscara", price: 30, promoPrice: 15 },
    { name: "Pincel", price: 10, promoPrice: null },
    { name: "Combo Olhos", price: 60, promoPrice: null },
    { name: "Cola", price: 40, promoPrice: 32 },
  ];

  const { combos, offers } = splitBlackOffers(products);

  assert.deepEqual(
    combos.map((p) => p.name),
    ["Combo Rosto", "Combo Olhos"],
  );
  assert.deepEqual(
    offers.map((p) => p.name),
    ["Máscara", "Cola", "Batom"],
  );
});

test("sem produtos em oferta ou combo, as duas listas ficam vazias", () => {
  const { combos, offers } = splitBlackOffers([
    { name: "Pincel", price: 10, promoPrice: null },
  ]);
  assert.deepEqual(combos, []);
  assert.deepEqual(offers, []);
});
