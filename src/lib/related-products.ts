// Sugestões de produtos para a página do produto (lógica pura, para ser testada).
//
// "Quem comprou este também levou": produtos que apareceram nos mesmos pedidos (a
// ordem vem do banco, já pontuada). Quando o histórico ainda é pouco, a lista é
// completada com "Você também pode gostar": produtos da mesma categoria.

export type RelatedCandidate = {
  id: string;
  stock: string; // DISPONIVEL | POUCAS_UNIDADES | INDISPONIVEL
  bestSeller: boolean;
  category: { id: string };
  categories: { id: string }[];
  subcategory: { id: string } | null;
};

export type RelatedOptions = {
  togetherMax?: number;
  totalMax?: number;
  similarMax?: number;
};

export type RelatedProducts<T> = { together: T[]; similar: T[] };

function categoryIds(product: RelatedCandidate) {
  return new Set([product.category.id, ...product.categories.map((category) => category.id)]);
}

// `coPurchasedIds` = produtos comprados junto, do mais para o menos frequente.
// `catalog` = produtos ativos, já na ordem de vitrine da loja.
export function pickRelated<T extends RelatedCandidate>(
  product: T,
  coPurchasedIds: readonly string[],
  catalog: readonly T[],
  options: RelatedOptions = {}
): RelatedProducts<T> {
  const togetherMax = options.togetherMax ?? 6;
  const totalMax = options.totalMax ?? 8;
  const similarMax = options.similarMax ?? 6;

  const byId = new Map(catalog.map((item) => [item.id, item]));
  const used = new Set<string>([product.id]);

  const together: T[] = [];
  for (const id of coPurchasedIds) {
    if (together.length >= togetherMax) break;
    const item = byId.get(id);
    if (!item || used.has(id) || item.stock === "INDISPONIVEL") continue;
    used.add(id);
    together.push(item);
  }

  const similarLimit = Math.max(0, Math.min(similarMax, totalMax - together.length));
  const mine = categoryIds(product);
  const scored: { item: T; score: number; order: number }[] = [];

  catalog.forEach((item, order) => {
    if (used.has(item.id) || item.stock === "INDISPONIVEL") return;
    const sharesCategory = [...categoryIds(item)].some((id) => mine.has(id));
    if (!sharesCategory) return;
    const sameSubcategory = Boolean(product.subcategory && item.subcategory?.id === product.subcategory.id);
    scored.push({ item, score: (sameSubcategory ? 3 : 0) + (item.bestSeller ? 1 : 0), order });
  });

  // Mesma subcategoria primeiro, depois os mais vendidos; empate segue a ordem da vitrine.
  scored.sort((a, b) => b.score - a.score || a.order - b.order);
  const similar = scored.slice(0, similarLimit).map((entry) => entry.item);

  return { together, similar };
}
