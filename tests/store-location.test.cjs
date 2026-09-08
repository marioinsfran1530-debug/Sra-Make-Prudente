const test = require("node:test");
const assert = require("node:assert/strict");

const {
  STORE_LOCATION_DEFAULTS,
  resolveStoreLocation,
} = require("../.tmp-tests/store-location.js");

test("usa os dados padrão quando a configuração está vazia", () => {
  const result = resolveStoreLocation(null);

  assert.equal(result.address, STORE_LOCATION_DEFAULTS.address);
  assert.equal(result.businessHours, STORE_LOCATION_DEFAULTS.businessHours);
  assert.match(result.mapsUrl, /^https:\/\/www\.google\.com\/maps\/search/);
});

test("preserva endereço, Maps, horário e WhatsApp configurados", () => {
  const result = resolveStoreLocation({
    address: "Rua Teste, 10",
    googleMapsUrl: "https://maps.app.goo.gl/teste",
    businessHours: "Segunda a sábado, das 10h às 18h.",
    whatsapp: "55 18 90000-0000",
  });

  assert.deepEqual(result, {
    address: "Rua Teste, 10",
    mapsUrl: "https://maps.app.goo.gl/teste",
    businessHours: "Segunda a sábado, das 10h às 18h.",
    whatsapp: "55 18 90000-0000",
  });
});

test("corrige a apresentação do horário antigo com erros de digitação", () => {
  const result = resolveStoreLocation({
    businessHours:
      "Segunda a Sexta das 09:00 as 17:00 Sabado 09:00 as 15:00 Domingo e Feriados sómente online",
  });

  assert.equal(result.businessHours, STORE_LOCATION_DEFAULTS.businessHours);
});

test("descarta link inseguro e cria uma busca pelo endereço", () => {
  const result = resolveStoreLocation({
    address: "Rua Segura, 20",
    googleMapsUrl: "javascript:alert(1)",
  });

  assert.match(result.mapsUrl, /^https:\/\/www\.google\.com\/maps\/search/);
  assert.match(result.mapsUrl, /Rua%20Segura%2C%2020/);
});
