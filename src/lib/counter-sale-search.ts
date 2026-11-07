// Busca de produtos na venda de balcão (lógica pura, para ser testada).
//
// Antes, a busca procurava a frase inteira como um pedaço de texto: "cola cilios"
// não achava "Cola para cílios". Agora cada palavra é procurada separadamente
// (todas precisam aparecer, em qualquer ordem), ignorando "de", "para" etc. e
// aceitando plural/singular, como na busca da loja.

import { normalizeSearchText, searchTerms } from "./product-search";

function singular(term: string) {
  return term.length > 3 && term.endsWith("s") ? term.slice(0, -1) : term;
}

export function matchesCounterSaleQuery(fields: Array<string | null | undefined>, query: string) {
  const terms = searchTerms(query);
  if (terms.length === 0) return true;

  const haystack = normalizeSearchText(fields.filter(Boolean).join(" "));
  return terms.every((term) => haystack.includes(term) || haystack.includes(singular(term)));
}
