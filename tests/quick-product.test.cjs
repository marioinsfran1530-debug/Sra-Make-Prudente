const test = require("node:test");
const assert = require("node:assert/strict");

const { parseQuickProduct, parseVariantNames, MAX_QUICK_VARIANTS } = require("../.tmp-tests/quick-product.js");

const base = { name: "Aparador de sobrancelha", brand: "Vivai", categoryId: "cat1", price: "12,90" };

test("aceita o mínimo e normaliza", () => {
  const out = parseQuickProduct({ ...base, name: "  Aparador de sobrancelha  ", sku: " " });
  assert.ok(out.value, out.error);
  assert.deepEqual(out.value, {
    name: "Aparador de sobrancelha",
    brand: "Vivai",
    sku: null,
    price: 12.9,
    categoryId: "cat1",
    variants: [],
  });
});

test("preço aceita número ou texto brasileiro", () => {
  assert.equal(parseQuickProduct({ ...base, price: 9.5 }).value.price, 9.5);
  assert.equal(parseQuickProduct({ ...base, price: "1.299,90" }).value.price, 1299.9);
});

test("exige nome, marca, preço e categoria", () => {
  assert.ok(parseQuickProduct({ ...base, name: "ab" }).error);
  assert.ok(parseQuickProduct({ ...base, brand: "" }).error);
  assert.ok(parseQuickProduct({ ...base, price: "" }).error);
  assert.ok(parseQuickProduct({ ...base, price: "0" }).error);
  assert.ok(parseQuickProduct({ ...base, price: "abc" }).error);
  assert.ok(parseQuickProduct({ ...base, categoryId: "  " }).error);
  assert.ok(parseQuickProduct(null).error);
  assert.ok(parseQuickProduct("texto").error);
});

test("EAN com dígito verificador errado é recusado", () => {
  assert.ok(parseQuickProduct({ ...base, sku: "7891234567890" }).error);
  assert.ok(parseQuickProduct({ ...base, sku: "7891000100103" }).value);
  assert.ok(parseQuickProduct({ ...base, sku: "APAR-01" }).value);
});

test("variações: separadores, espaços, repetidas e limite", () => {
  assert.deepEqual(parseVariantNames("Preto, Marrom;  Nude \n Cinza"), ["Preto", "Marrom", "Nude", "Cinza"]);
  assert.deepEqual(parseVariantNames("Preto, preto, PRETO"), ["Preto"]);
  assert.deepEqual(parseVariantNames("Cílio, cilio"), ["Cílio"]);
  assert.deepEqual(parseVariantNames(" , ;; "), []);
  const many = Array.from({ length: 50 }, (_, i) => `Cor ${i}`).join(",");
  assert.equal(parseVariantNames(many).length, MAX_QUICK_VARIANTS);
  assert.equal(parseQuickProduct({ ...base, variants: "Preto, Marrom" }).value.variants.length, 2);
});
