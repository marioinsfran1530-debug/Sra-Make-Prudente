const test = require("node:test");
const assert = require("node:assert/strict");
const {
  productIdFromLegacySlug,
  productPath,
  productSlug,
} = require("../.tmp-tests/product-url.js");

test("gera URL amigável normalizando acentos e espaços", () => {
  const product = {
    name: "Máscara para Cílios Define e Alonga HB500 Ruby Rose 5 ml",
    brand: "Ruby Rose",
  };

  assert.equal(
    productSlug(product),
    "mascara-para-cilios-define-e-alonga-hb500-ruby-rose-5-ml-ruby-rose",
  );
  assert.equal(
    productPath(product),
    "/produto/mascara-para-cilios-define-e-alonga-hb500-ruby-rose-5-ml-ruby-rose",
  );
});

test("resolve URLs anteriores aos ajustes de digitação", () => {
  assert.equal(
    productIdFromLegacySlug("bory-splash-bio-instinto"),
    "cmt5xelhb0025cj2jp0mc9ee2",
  );
  assert.equal(
    productIdFromLegacySlug("nessecer-variado"),
    "cmt66povx000v4thr741j3s78",
  );
  assert.equal(productIdFromLegacySlug("produto-inexistente"), null);
});
