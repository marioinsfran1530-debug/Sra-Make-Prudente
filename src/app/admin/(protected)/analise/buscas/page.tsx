import Link from "next/link";
import { getSearchBursts } from "@/lib/search-data";
import {
  isZeroResult,
  originBreakdown,
  rankTerms,
  summarizeSearches,
} from "@/lib/search-analysis";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;

export default async function SearchAnalysisPage() {
  const bursts = await getSearchBursts(WINDOW_DAYS);

  const summary = summarizeSearches(bursts);
  const zeroTerms = rankTerms(bursts.filter(isZeroResult));
  const popularTerms = rankTerms(bursts);
  const origins = originBreakdown(bursts);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">Demanda real</p>
          <h1 className="font-serif text-2xl font-bold text-texto">O que os clientes procuram</h1>
          <p className="mt-1 max-w-3xl text-sm text-cinza">
            Buscas feitas no catálogo nos últimos {WINDOW_DAYS} dias. Cada pessoa conta uma vez por termo, e quem vai digitando e corrigindo
            (“Higienizqd… Higienizador”) conta como uma busca só. Termos sem resultado ajudam a identificar produtos, marcas e categorias
            que podem estar faltando no catálogo.
          </p>
        </div>
        <Link href="/admin/analise" className="text-xs font-bold text-rosa-profundo hover:underline">
          ← Voltar para análise
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Pessoas que buscaram" value={summary.people.toLocaleString("pt-BR")} />
        <Metric label="Buscas feitas" value={summary.searches.toLocaleString("pt-BR")} />
        <Metric
          label="Buscas sem resultado"
          value={summary.zeroSearches.toLocaleString("pt-BR")}
          helper={`${summary.zeroPeople.toLocaleString("pt-BR")} pessoa${summary.zeroPeople === 1 ? "" : "s"}`}
        />
        <Metric
          label="Taxa sem resultado"
          value={`${summary.zeroRate.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Oportunidades: buscas sem resultado"
          description="Termo final de cada busca que terminou sem nenhum produto. O número é de pessoas diferentes. Se um termo se repetir entre pessoas, vale revisar o nome dos produtos, sinônimos da busca ou considerar incluir o item no mix."
          empty="Ainda não há buscas sem resultado registradas."
        >
          {zeroTerms.map((item) => (
            <Row key={item.key} label={item.label} value={item.people} searches={item.searches} priority />
          ))}
        </Panel>

        <Panel
          title="Termos mais buscados"
          description="Mostra a demanda interna independentemente de ter encontrado resultado, contando pessoas diferentes."
          empty="Ainda não há buscas suficientes para formar um ranking."
        >
          {popularTerms.map((item) => (
            <Row key={item.key} label={item.label} value={item.people} searches={item.searches} />
          ))}
        </Panel>

        <div className="xl:col-span-2">
          <Panel
            title="De onde vêm as pessoas que buscam"
            description="Canal pelo qual a pessoa chegou à loja antes de buscar. A segunda coluna mostra quantas delas terminaram alguma busca sem resultado."
            empty="Ainda não há buscas suficientes para mostrar a origem."
          >
            {origins.map((item) => (
              <OriginRow key={item.label} label={item.label} people={item.people} zeroPeople={item.zeroPeople} />
            ))}
          </Panel>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-rosa/10 bg-creme/60 p-4 text-xs leading-5 text-cinza">
        <strong className="text-texto">Como usar:</strong> não compre estoque apenas porque um termo apareceu uma vez. Priorize repetição entre pessoas diferentes, margem, disponibilidade de fornecedor e intenção comercial. Para erros de digitação ou nomes alternativos, a melhor solução pode ser melhorar a busca em vez de cadastrar outro produto.
        <br />
        <strong className="text-texto">Como contamos:</strong> a busca é anônima (só um código do navegador, sem nome nem telefone). Acessos feitos pelo preview do painel não entram. A loja encontra palavras com pequenos erros de digitação e ignora “de”, “em” e “para”, então um termo que aparece aqui sem resultado, em geral, realmente não existe no catálogo.
      </div>
    </div>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-2xl font-extrabold text-texto">{value}</p>
      <p className="mt-1 text-xs text-cinza">{label}</p>
      {helper && <p className="mt-0.5 text-[10px] text-cinza">{helper}</p>}
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

function Row({
  label,
  value,
  searches,
  priority = false,
}: {
  label: string;
  value: number;
  searches: number;
  priority?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-texto">{label}</p>
        {searches > value && (
          <p className="text-[10px] text-cinza">
            {searches.toLocaleString("pt-BR")} buscas de {value.toLocaleString("pt-BR")} pessoa{value === 1 ? "" : "s"}
          </p>
        )}
      </div>
      <span
        title="Pessoas diferentes"
        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${priority ? "bg-amber-50 text-amber-700" : "bg-creme text-rosa-profundo"}`}
      >
        {value.toLocaleString("pt-BR")}
      </span>
    </div>
  );
}

function OriginRow({ label, people, zeroPeople }: { label: string; people: number; zeroPeople: number }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <p className="min-w-0 truncate text-sm font-semibold text-texto">{label}</p>
      <div className="flex shrink-0 items-center gap-2">
        {zeroPeople > 0 && (
          <span className="text-[10px] text-cinza">
            {zeroPeople.toLocaleString("pt-BR")} sem resultado
          </span>
        )}
        <span
          title="Pessoas que buscaram"
          className="rounded-full bg-creme px-2.5 py-1 text-[11px] font-bold text-rosa-profundo"
        >
          {people.toLocaleString("pt-BR")}
        </span>
      </div>
    </div>
  );
}
