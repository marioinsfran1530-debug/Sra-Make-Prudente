// Busca de produtos da loja (lógica pura, sem banco), para ser testada.
//
// Regras:
// 1. Palavras de ligação ("de", "em", "para"...) são ignoradas: quem digita
//    "pincel de sereia" encontra o "Pincel sereia".
// 2. Todas as palavras relevantes precisam aparecer no produto (nome, marca,
//    SKU, descrição, categorias, variantes), como sempre foi. Plural e singular
//    valem igual.
// 3. Se existir qualquer produto que atenda a (2), só esses são mostrados.
// 4. Se não existir nenhum, tenta uma busca aproximada (erro de digitação ou
//    palavra incompleta) apenas nas palavras do nome, marca, categoria, SKU e
//    variantes. O resultado vem marcado como "aproximado" para a tela avisar.

export function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// "pro" e "sem" ficam de fora desta lista de propósito: "Pro" aparece em nomes
// de marca/linha (Salon Pro) e "sem" em "sem marca".
const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas",
  "para", "pra", "com", "por", "ao", "a", "o", "as", "os", "e", "um", "uma",
]);

// Palavras relevantes da busca. Se a pessoa digitou só palavras de ligação,
// elas são mantidas para a busca não ficar vazia.
export function searchTerms(query: string) {
  const tokens = normalizeSearchText(query).split(" ").filter(Boolean);
  const meaningful = tokens.filter((token) => !STOPWORDS.has(token));
  return meaningful.length > 0 ? meaningful : tokens;
}

// Quantos erros de digitação aceitamos por tamanho da palavra. Palavras curtas
// não aceitam erro, para "cola" não virar "cota".
export function typoAllowance(length: number) {
  if (length <= 4) return 0;
  if (length <= 7) return 1;
  if (length <= 10) return 2;
  return 3;
}

// Distância de edição (inserir, apagar, trocar, inverter duas letras vizinhas),
// com corte antecipado quando passa do limite.
export function editDistance(a: string, b: string, limit: number) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;

  let beforePrevious: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, beforePrevious[j - 2] + 1);
      }

      current[j] = value;
      if (value < rowMin) rowMin = value;
    }

    if (rowMin > limit) return limit + 1;
    beforePrevious = previous;
    previous = current;
  }

  return previous[b.length];
}

// Custo de uma palavra digitada contra uma palavra do produto: 0 = igual,
// 1..n = erros de digitação, null = não parece a mesma palavra. Também compara
// com o começo da palavra do produto, para quem digitou "bronzer" achar
// "bronzeamento".
export function wordCost(term: string, word: string): number | null {
  const limit = typoAllowance(term.length);
  if (limit === 0 || term[0] !== word[0]) return null;

  let best = limit + 1;
  const whole = editDistance(term, word, limit);
  if (whole < best) best = whole;

  if (word.length > term.length) {
    for (const size of [term.length - 1, term.length, term.length + 1]) {
      if (size < 1 || size > word.length) continue;
      const distance = editDistance(term, word.slice(0, size), limit);
      if (distance < best) best = distance;
    }
  }

  return best <= limit ? best : null;
}

export type SearchableProduct = {
  name: string;
  brand: string;
  sku: string | null;
  description: string | null;
  category: { name: string };
  subcategory: { name: string } | null;
  categories: { category: { name: string } }[];
  variants: { name: string }[];
};

type Prepared = { full: string; words: string[] };

function prepare(product: SearchableProduct): Prepared {
  const primary = normalizeSearchText(
    [
      product.name,
      product.brand,
      product.sku,
      product.category.name,
      product.subcategory?.name,
      ...product.categories.map((item) => item.category.name),
      ...product.variants.map((variant) => variant.name),
    ]
      .filter(Boolean)
      .join(" ")
  );

  const full = normalizeSearchText(`${primary} ${product.description ?? ""}`);
  return { full, words: Array.from(new Set(primary.split(" ").filter(Boolean))) };
}

function singular(term: string) {
  return term.length > 3 && term.endsWith("s") ? term.slice(0, -1) : term;
}

function matchesExactly(prepared: Prepared, term: string) {
  return prepared.full.includes(term) || prepared.full.includes(singular(term));
}

function fuzzyCost(prepared: Prepared, term: string): number | null {
  let best: number | null = null;
  for (const word of prepared.words) {
    const cost = wordCost(term, word) ?? wordCost(singular(term), word);
    if (cost !== null && (best === null || cost < best)) best = cost;
    if (best === 1) break;
  }
  return best;
}

export type SearchOutcome<T> = { items: T[]; approximate: boolean };

// Filtra e ordena os produtos para uma busca. A ordem original (destaques,
// mais vendidos, novidades) é mantida entre os resultados exatos.
export function searchProducts<T extends SearchableProduct>(
  products: T[],
  query: string,
  options: { allowApproximate?: boolean } = {}
): SearchOutcome<T> {
  const terms = searchTerms(query);
  if (terms.length === 0) return { items: products, approximate: false };

  const prepared = products.map((product) => ({ product, data: prepare(product) }));

  const exact = prepared.filter(({ data }) => terms.every((term) => matchesExactly(data, term)));
  if (exact.length > 0) {
    return { items: exact.map(({ product }) => product), approximate: false };
  }

  if (options.allowApproximate === false) return { items: [], approximate: false };

  const approximate: { product: T; cost: number; index: number }[] = [];
  prepared.forEach(({ product, data }, index) => {
    let total = 0;
    for (const term of terms) {
      if (matchesExactly(data, term)) continue;
      const cost = fuzzyCost(data, term);
      if (cost === null) return;
      total += cost;
    }
    approximate.push({ product, cost: total, index });
  });

  approximate.sort((a, b) => a.cost - b.cost || a.index - b.index);
  return { items: approximate.map(({ product }) => product), approximate: approximate.length > 0 };
}
