// Cache em memória com prazo curto (lógica pura, para ser testada).
//
// Serve para leituras públicas que se repetem a cada visita (catálogo, índice de
// endereços de produto) e que o Supabase cobra como tráfego de saída do banco.
// Vale por instância do servidor: o dado pode ficar velho até `ttlMs`, nunca mais.

export type TtlCache<T> = {
  get(): Promise<T>;
  // Esquece o valor guardado; a próxima leitura vai ao banco.
  clear(): void;
};

export function createTtlCache<T>(
  load: () => Promise<T>,
  ttlMs: number,
  now: () => number = Date.now
): TtlCache<T> {
  let stored: { data: T; at: number } | null = null;
  let inflight: Promise<T> | null = null;

  return {
    get() {
      if (stored && now() - stored.at < ttlMs) return Promise.resolve(stored.data);
      // Várias visitas ao mesmo tempo esperam uma única consulta.
      if (inflight) return inflight;

      const request: Promise<T> = load()
        .then((data) => {
          stored = { data, at: now() };
          return data;
        })
        .catch((error: unknown) => {
          // Se o banco falhar, é melhor mostrar o dado de poucos minutos atrás
          // do que derrubar a página.
          if (stored) return stored.data;
          throw error;
        })
        .finally(() => {
          if (inflight === request) inflight = null;
        });
      inflight = request;
      return request;
    },
    clear() {
      stored = null;
    },
  };
}
