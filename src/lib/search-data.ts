import { prisma } from "@/lib/prisma";
import { consolidateSearches } from "@/lib/search-analysis";

// Acesso a dados das buscas da loja (somente servidor). Os eventos
// "search_submit" (quando a pessoa aperta Enter na barra) não trazem a contagem
// de resultados, então só os de resultado entram na análise.
export async function getSearchBursts(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const events = await prisma.analyticsEvent.findMany({
    where: {
      event: "search",
      query: { not: null },
      createdAt: { gte: since },
      OR: [{ context: null }, { context: { not: "search_submit" } }],
    },
    select: {
      sessionId: true,
      query: true,
      itemCount: true,
      createdAt: true,
      origin: true,
    },
    orderBy: { createdAt: "asc" },
    take: 20000,
  });

  return consolidateSearches(events);
}
