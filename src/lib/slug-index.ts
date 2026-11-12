// Índice "endereço do produto → produto" em memória (lógica pura, para ser testada).
//
// O endereço (/produto/nome-marca) é calculado a partir do nome e da marca, então
// achar o produto exigia ler todos os produtos ativos a cada visita. Aqui a lista
// é lida uma vez e reaproveitada por `ttlMs`. Se um endereço não é encontrado (produto
// novo ou renomeado), a lista é relida, no máximo uma vez a cada `missRefreshMs`,
// para endereços inexistentes (robôs) não voltarem a pesar no banco.

import { createTtlCache } from "./ttl-cache";

export type SlugIndexOptions<T> = {
  load: () => Promise<T[]>;
  slugOf: (item: T) => string;
  ttlMs: number;
  missRefreshMs: number;
  now?: () => number;
};

export function createSlugIndex<T>(options: SlugIndexOptions<T>) {
  const now = options.now ?? Date.now;
  let loadedAt = Number.NEGATIVE_INFINITY;

  const cache = createTtlCache<Map<string, T>>(
    async () => {
      const items = await options.load();
      const map = new Map<string, T>();
      for (const item of items) {
        const slug = options.slugOf(item);
        // Se dois produtos gerarem o mesmo endereço, vale o primeiro (como antes).
        if (!map.has(slug)) map.set(slug, item);
      }
      loadedAt = now();
      return map;
    },
    options.ttlMs,
    now
  );

  return {
    async find(slug: string): Promise<T | null> {
      let map = await cache.get();
      const hit = map.get(slug);
      if (hit !== undefined) return hit;

      if (now() - loadedAt < options.missRefreshMs) return null;
      cache.clear();
      map = await cache.get();
      return map.get(slug) ?? null;
    },
  };
}
