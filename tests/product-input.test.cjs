const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidGtin, validateProductInput } = require('../.tmp-tests/product-input.js');

test('aceita um cadastro de produto consistente', () => {
  const result = validateProductInput({
    name: 'Gloss Labial Rosa',
    brand: 'Ruby Rose',
    sku: '7898671421312',
    description: 'Gloss labial com acabamento brilhante para uso diário.',
    price: 19.9,
    promoPrice: 14.9,
    stockQty: 10,
  });
  assert.equal(result.ok, true);
  assert.equal(result.data.name, 'Gloss Labial Rosa');
});

test('rejeita preço, promoção e estoque inconsistentes', () => {
  const result = validateProductInput({
    name: 'Produto Teste',
    brand: 'Marca',
    price: 10,
    promoPrice: 12,
    stockQty: -1,
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /promocional/i);
  assert.match(result.errors.join(' '), /estoque/i);
});

test('mantém SKU interno livre, mas valida EAN/GTIN numérico', () => {
  const internal = validateProductInput({
    name: 'Produto Interno',
    brand: 'Marca',
    sku: 'SKU-ABC-10',
    price: 10,
    stockQty: 1,
  });
  assert.equal(internal.ok, true);
  assert.equal(isValidGtin('7898671421312'), true);

  const invalid = validateProductInput({
    name: 'Produto EAN',
    brand: 'Marca',
    sku: '7898671421313',
    price: 10,
    stockQty: 1,
  });
  assert.equal(invalid.ok, false);
  assert.match(invalid.errors.join(' '), /GTIN/i);
});
