const test = require("node:test");
const assert = require("node:assert/strict");
const {
  findProductSlugConflict,
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

test("mantém os endereços antigos dos grupos que tinham URL duplicada", () => {
  assert.equal(
    productIdFromLegacySlug("cilios-posticos-sabrina-sato"),
    "cmt5ypy9f002ilkykcwqfp9uq",
  );
  assert.equal(
    productIdFromLegacySlug("paleta-de-sombras-t-e-g"),
    "cmt37b2be0007121rtmd7aews",
  );
});

test("detecta nome e marca que produziriam a mesma URL", () => {
  const candidates = [
    { id: "produto-1", name: "Cílios postiços", brand: "Sabrina Sato" },
    { id: "produto-2", name: "Paleta 9 cores", brand: "T&G" },
  ];

  assert.equal(
    findProductSlugConflict(
      { name: "  Cílios   postiços ", brand: "Sabrina Sato " },
      candidates,
    )?.id,
    "produto-1",
  );
  assert.equal(
    findProductSlugConflict(
      { name: "Cílios postiços", brand: "Sabrina Sato" },
      candidates,
      "produto-1",
    ),
    null,
  );
});
