const test = require("node:test");
const assert = require("node:assert/strict");
const {
  GOOGLE_REVIEWS,
  GOOGLE_REVIEWS_SNAPSHOT,
  formatRating,
  formatReviewDate,
  pluralReviews,
} = require("../.tmp-tests/google-reviews.js");

test("formata a nota com vírgula", () => {
  assert.equal(formatRating(5), "5,0");
  assert.equal(formatRating(4.5), "4,5");
});

test("formata a data da avaliação", () => {
  assert.equal(formatReviewDate("2026-10-31"), "31 out 2026");
  assert.equal(formatReviewDate("2026-09-05"), "5 set 2026");
  assert.equal(formatReviewDate("2026-13-01"), "");
  assert.equal(formatReviewDate("lixo"), "");
});

test("plural de avaliações", () => {
  assert.equal(pluralReviews(1), "1 avaliação");
  assert.equal(pluralReviews(18), "18 avaliações");
});

test("as avaliações exibidas são consistentes com o resumo", () => {
  assert.ok(GOOGLE_REVIEWS.length > 0);
  assert.ok(GOOGLE_REVIEWS.length <= GOOGLE_REVIEWS_SNAPSHOT.total);
  assert.ok(GOOGLE_REVIEWS_SNAPSHOT.rating >= 1 && GOOGLE_REVIEWS_SNAPSHOT.rating <= 5);
});

test("toda avaliação tem autor, texto, 5 estrelas e data válida, da mais recente para a mais antiga", () => {
  let previous = "9999-12-31";
  for (const review of GOOGLE_REVIEWS) {
    assert.ok(review.author.trim().length > 0);
    assert.ok(review.text.trim().length > 0);
    assert.equal(review.stars, 5);
    assert.notEqual(formatReviewDate(review.date), "");
    assert.ok(review.date <= previous, `fora de ordem: ${review.author}`);
    previous = review.date;
  }
});

test("nenhum texto guarda a tradução automática do Google", () => {
  for (const review of GOOGLE_REVIEWS) {
    assert.ok(!/translated by google/i.test(review.text), review.author);
  }
});

test("os links do Google são https", () => {
  assert.match(GOOGLE_REVIEWS_SNAPSHOT.mapsUrl, /^https:\/\//);
  assert.match(GOOGLE_REVIEWS_SNAPSHOT.writeReviewUrl, /^https:\/\//);
});
