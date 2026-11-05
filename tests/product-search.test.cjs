const test = require("node:test");
const assert = require("node:assert/strict");

const {
  editDistance,
  normalizeSearchText,
  searchProducts,
  searchTerms,
  typoAllowance,
  wordCost,
} = require("../.tmp-tests/product-search.js");

function item(name, extra = {}) {
  return {
    name,
    brand: "Marca",
    sku: null,
    description: null,
    category: { name: "Geral" },
    subcategory: null,
    categories: [],
    variants: [],
    ...extra,
  };
}

const names = (outcome) => outcome.items.map((product) => product.name);

test("normaliza acento, caixa e pontuação", () => {
  assert.equal(normalizeSearchText("  Látex, LÍQUIDO! "), "latex liquido");
  assert.equal(normalizeSearchText(null), "");
});

test("ignora palavras de ligação, mas mantém a busca quando só há elas", () => {
  assert.deepEqual(searchTerms("Pincel de sereia"), ["pincel", "sereia"]);
  assert.deepEqual(searchTerms("Esmalte em gel"), ["esmalte", "gel"]);
  assert.deepEqual(searchTerms("de para"), ["de", "para"]);
  // "pro" faz parte de nomes de linha, então não é palavra de ligação.
  assert.deepEqual(searchTerms("cola salon pro"), ["cola", "salon", "pro"]);
});

test("'Pincel de sereia' encontra o produto 'Pincel sereia'", () => {
  const result = searchProducts([item("Pincel sereia"), item("Pincel leque")], "Pincel de sereia");
  assert.deepEqual(names(result), ["Pincel sereia"]);
  assert.equal(result.approximate, false);
});

test("plural e singular valem igual", () => {
  const products = [item("Cílio postiço"), item("Esmalte vermelho")];
  assert.deepEqual(names(searchProducts(products, "cilios")), ["Cílio postiço"]);
  assert.deepEqual(names(searchProducts(products, "esmaltes")), ["Esmalte vermelho"]);
});

test("exatos têm prioridade e mantêm a ordem original", () => {
  const products = [item("Cola B"), item("Cílios"), item("Cola A")];
  const result = searchProducts(products, "cola");
  assert.deepEqual(names(result), ["Cola B", "Cola A"]);
  assert.equal(result.approximate, false);
});

test("a descrição continua entrando na busca exata", () => {
  const result = searchProducts(
    [item("Kit A", { description: "Acompanha lixadeira elétrica" }), item("Kit B")],
    "lixadeira"
  );
  assert.deepEqual(names(result), ["Kit A"]);
});

test("erro de digitação: acha o produto e marca como aproximado", () => {
  const products = [item("Higienizador de cílios"), item("Cola Salon Pro")];
  const typo = searchProducts(products, "Higienizqdor");
  assert.deepEqual(names(typo), ["Higienizador de cílios"]);
  assert.equal(typo.approximate, true);

  const swapped = searchProducts([item("Cílios Tufinho")], "cilois");
  assert.deepEqual(names(swapped), ["Cílios Tufinho"]);
});

test("palavra incompleta ou com final diferente acha pelo começo", () => {
  const products = [item("Bronzeamento"), item("Base líquida")];
  assert.deepEqual(names(searchProducts(products, "Bronzer")), ["Bronzeamento"]);
  assert.deepEqual(names(searchProducts(products, "Bronzear")), ["Bronzeamento"]);
});

test("mistura palavra certa e palavra com erro", () => {
  const products = [item("Máscara para sobrancelha"), item("Máscara de cílios")];
  const result = searchProducts(products, "mascara sombarcelha");
  assert.deepEqual(names(result), ["Máscara para sobrancelha"]);
  assert.equal(result.approximate, true);
});

test("produto que não existe continua sem resultado", () => {
  const products = [item("Pincel sereia"), item("Cola Salon Pro")];
  const result = searchProducts(products, "Higienizador");
  assert.deepEqual(result.items, []);
  assert.equal(result.approximate, false);
});

test("palavras curtas e primeira letra errada não viram aproximação", () => {
  assert.equal(typoAllowance(4), 0);
  assert.equal(typoAllowance(5), 1);
  assert.equal(typoAllowance(9), 2);
  assert.equal(typoAllowance(12), 3);

  assert.deepEqual(searchProducts([item("Cola branca")], "cota").items, []);
  assert.equal(wordCost("xilios", "cilios"), null);
});

test("aproximação não olha a descrição, só nome, marca e categorias", () => {
  const result = searchProducts([item("Kit A", { description: "Acompanha lixadeira elétrica" })], "lixadera");
  assert.deepEqual(result.items, []);
});

test("resultados aproximados mais próximos vêm primeiro", () => {
  const products = [item("Esmaltezinho"), item("Esmaltee")];
  const result = searchProducts(products, "esmalte x");
  // nenhum tem "x"; sem exato, nenhum atende todas as palavras
  assert.equal(result.approximate, false);

  const order = searchProducts([item("Bronzeadores"), item("Bronzer")], "Bronzar");
  assert.equal(order.items[0].name, "Bronzer");
});

test("busca vazia devolve tudo", () => {
  const products = [item("A"), item("B")];
  assert.equal(searchProducts(products, "   ").items.length, 2);
});

test("distância de edição conta troca de letras vizinhas como 1", () => {
  assert.equal(editDistance("cilios", "cilois", 2), 1);
  assert.equal(editDistance("cola", "cola", 1), 0);
  assert.equal(editDistance("abcdef", "uvwxyz", 2), 3);
});

test("com a aproximação desligada, só resultados exatos são devolvidos", () => {
  const products = [item("Bronzeamento")];
  assert.deepEqual(searchProducts(products, "Bronzer", { allowApproximate: false }).items, []);
  assert.deepEqual(names(searchProducts(products, "Bronzeamento", { allowApproximate: false })), ["Bronzeamento"]);
  assert.equal(searchProducts(products, "Bronzer").approximate, true);
});
