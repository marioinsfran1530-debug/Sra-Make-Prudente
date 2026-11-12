// Escolha de itens na entrada de estoque (lógica pura, para ser testada).
//
// A busca devolve um item por produto sem variação e um por variação. Para a pessoa
// não confundir produtos parecidos, os itens são mostrados agrupados por produto
// (foto e nome uma vez, variações embaixo), e as linhas da entrada ficam juntas.

export type PickGroup<T extends { productId: string }> = {
  productId: string;
  items: T[];
};

// Agrupa mantendo a ordem em que cada produto apareceu primeiro. `limit` conta
// produtos (não variações), para um produto com 6 variações não esconder os outros.
export function groupByProduct<T extends { productId: string }>(
  items: readonly T[],
  limit: number
): { groups: PickGroup<T>[]; totalProducts: number } {
  const order: string[] = [];
  const byProduct = new Map<string, T[]>();
  for (const item of items) {
    const list = byProduct.get(item.productId);
    if (list) {
      list.push(item);
    } else {
      byProduct.set(item.productId, [item]);
      order.push(item.productId);
    }
  }
  const groups = order.slice(0, Math.max(0, limit)).map((productId) => ({
    productId,
    items: byProduct.get(productId) ?? [],
  }));
  return { groups, totalProducts: order.length };
}

// Coloca novas linhas logo depois da última linha do mesmo produto (para as variações
// de um produto ficarem juntas e o preço de venda aparecer no primeiro item dele).
// Se o produto ainda não está na entrada, vai para o fim.
export function insertAfterProduct<T extends { productId: string }>(
  lines: readonly T[],
  added: readonly T[]
): T[] {
  if (added.length === 0) return [...lines];
  const productId = added[0].productId;
  let last = -1;
  lines.forEach((line, index) => {
    if (line.productId === productId) last = index;
  });
  if (last === -1) return [...lines, ...added];
  return [...lines.slice(0, last + 1), ...added, ...lines.slice(last + 1)];
}
