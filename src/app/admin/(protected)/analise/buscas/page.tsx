import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function sinceDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export default async function SearchAnalysisPage() {
  const since = sinceDays(30);
  const reportableContext = [
    { context: null },
    { context: { not: "search_submit" } },
  ];

  const [totalSearches, zeroResultSearches, popularQueries, zeroResultQueries] = await Promise.all([
    prisma.analyticsEvent.count({
      where: {
        event: "search",
        createdAt: { gte: since },
        OR: reportableContext,
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        event: "search",
        itemCount: 0,
        createdAt: { gte: since },
        OR: reportableContext,
      },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["query"],
      where: {
        event: "search",
        query: { not: null },
        createdAt: { gte: since },
        OR: reportableContext,
      },
      _count: { _all: true },
      orderBy: { _count: { query: "desc" } },
      take: 20,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["query"],
      where: {
        event: "search",
        itemCount: 0,
        query: { not: null },
        createdAt: { gte: since },
        OR: reportableContext,
      },
      _count: { _all: true },
      orderBy: { _count: { query: "desc" } },
      take: 20,
    }),
  ]);

  const zeroRate = totalSearches > 0 ? (zeroResultSearches / totalSearches) * 100 : 0;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">Demanda real</p>
          <h1 className="font-serif text-2xl font-bold text-texto">O que os clientes procuram</h1>
          <p className="mt-1 max-w-3xl text-sm text-cinza">
            Buscas internas dos últimos 30 dias. Termos sem resultado ajudam a identificar produtos, marcas e categorias que podem estar faltando no catálogo.
          </p>
        </div>
        <Link href="/admin/analise" className="text-xs font-bold text-rosa-profundo hover:underline">
          ← Voltar para análise
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric label="Buscas realizadas" value={totalSearches.toLocaleString("pt-BR")} />
        <Metric label="Buscas sem resultado" value={zeroResultSearches.toLocaleString("pt-BR")} />
        <Metric label="Taxa sem resultado" value={`${zeroRate.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Oportunidades: buscas sem resultado"
          description="Se um termo aparecer repetidamente aqui, vale revisar o nome dos produtos, sinônimos da busca ou considerar incluir o item no mix."
          empty="Ainda não há buscas sem resultado registradas."
        >
          {zeroResultQueries.map((item, index) => (
            <Row key={item.query ?? index} label={item.query ?? "Busca não identificada"} value={item._count._all} priority />
          ))}
        </Panel>

        <Panel
          title="Termos mais buscados"
          description="Mostra a demanda interna independentemente de ter encontrado resultado."
          empty="Ainda não há buscas suficientes para formar um ranking."
        >
          {popularQueries.map((item, index) => (
            <Row key={item.query ?? index} label={item.query ?? "Busca não identificada"} value={item._count._all} />
          ))}
        </Panel>
      </div>

      <div className="mt-5 rounded-2xl border border-rosa/10 bg-creme/60 p-4 text-xs leading-5 text-cinza">
        <strong className="text-texto">Como usar:</strong> não compre estoque apenas porque um termo apareceu uma vez. Priorize repetição, margem, disponibilidade de fornecedor e intenção comercial. Para erros de digitação ou nomes alternativos, a melhor solução pode ser melhorar a busca em vez de cadastrar outro produto.
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-2xl font-extrabold text-texto">{value}</p>
      <p className="mt-1 text-xs text-cinza">{label}</p>
    </div>
  );
}

function Panel({
  title,
  description,
  empty,
  children,
}: {
  title: string;
  description: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="font-bold text-texto">{title}</h2>
      <p className="mt-1 text-[11px] leading-5 text-cinza">{description}</p>
      {hasChildren ? <div className="mt-3 divide-y divide-rosa/10">{children}</div> : <p className="mt-4 text-xs text-cinza">{empty}</p>}
    </section>
  );
}

function Row({ label, value, priority = false }: { label: string; value: number; priority?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <p className="min-w-0 truncate text-sm font-semibold text-texto">{label}</p>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${priority ? "bg-amber-50 text-amber-700" : "bg-creme text-rosa-profundo"}`}>
        {value.toLocaleString("pt-BR")}
      </span>
    </div>
  );
}
