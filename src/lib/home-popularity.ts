// Produtos populares da home (lógica pura, para ser testada).
//
// Cada pessoa (sessão) conta uma vez por produto e por tipo de evento, com peso
// maior para quem chamou no WhatsApp ou colocou na sacola. A contagem de sessões
// distintas é feita no próprio banco: antes cada visita à home baixava todos os
// eventos de 30 dias só para o código descartar as repetições.

export type HomePopularitySignals = {
  enoughData: boolean;
  uniqueSessions: number;
  totalSignals: number;
  scores: Map<string, number>;
};

export const POPULARITY_WEIGHTS: Record<string, number> = {
  product_view: 1,
  whatsapp_click: 3,
  add_to_cart: 4,
};

// `sessions` = sessões distintas que fizeram `event` no produto `productId`.
export type PopularityRow = {
  productId: string;
  event: string;
  sessions: number | bigint | string;
};

export function buildPopularitySignals(
  rows: readonly PopularityRow[],
  uniqueSessions: number | bigint | string
): HomePopularitySignals {
  const scores = new Map<string, number>();
  let totalSignals = 0;

  for (const row of rows) {
    const sessions = Number(row.sessions);
    if (!row.productId || !Number.isFinite(sessions) || sessions <= 0) continue;
    totalSignals += sessions;
    scores.set(
      row.productId,
      (scores.get(row.productId) ?? 0) + sessions * (POPULARITY_WEIGHTS[row.event] ?? 0)
    );
  }

  const sessionsCount = Number(uniqueSessions) || 0;
  return {
    enoughData: sessionsCount >= 5 && totalSignals >= 8,
    uniqueSessions: sessionsCount,
    totalSignals,
    scores,
  };
}
