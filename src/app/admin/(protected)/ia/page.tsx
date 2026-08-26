import { prisma } from "@/lib/prisma";
import {
  getGeminiModel,
  isGeminiConfigured,
  PRODUCT_DESCRIPTION_PROMPT_VERSION,
  PROMOTION_COPY_PROMPT_VERSION,
} from "@/lib/gemini";

export const dynamic = "force-dynamic";

function percent(value: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function featureLabel(feature: string) {
  if (feature === "product_description") return "Descrição de produto";
  if (feature === "promotion_copy") return "Copy de divulgação";
  return feature;
}

export default async function AdminAiPage() {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [all, recent, byFeature, byModel] = await Promise.all([
    prisma.aiSuggestionMetric.aggregate({
      _count: { _all: true },
      _sum: { suggestionCount: true },
    }),
    prisma.aiSuggestionMetric.findMany({
      where: { createdAt: { gte: since } },
      select: {
        feature: true,
        used: true,
        edited: true,
        suggestionCount: true,
      },
    }),
    prisma.aiSuggestionMetric.groupBy({
      by: ["feature"],
      _count: { _all: true },
      _sum: { suggestionCount: true },
      orderBy: { _count: { feature: "desc" } },
    }),
    prisma.aiSuggestionMetric.groupBy({
      by: ["model", "promptVersion"],
      _count: { _all: true },
      orderBy: { _count: { model: "desc" } },
      take: 8,
    }),
  ]);

  const used = recent.filter((item) => item.used).length;
  const edited = recent.filter((item) => item.used && item.edited === true).length;
  const unchanged = recent.filter((item) => item.used && item.edited === false).length;
  const unused = recent.filter((item) => !item.used).length;
  const suggestions = recent.reduce((total, item) => total + item.suggestionCount, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-rosa-profundo">
            Assistente do Admin
          </p>
          <h1 className="mt-1 font-serif text-2xl font-bold text-texto">IA</h1>
          <p className="mt-1 max-w-2xl text-sm text-cinza">
            A IA sugere texto; não publica produtos, não altera preço, estoque ou flags e não recebe dados de clientes.
          </p>
        </div>
        <div className={`rounded-full px-3 py-2 text-xs font-bold ${isGeminiConfigured() ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
          {isGeminiConfigured() ? "Gemini configurado" : "Gemini aguardando chave"}
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Gerações · 30 dias" value={recent.length} detail={`${suggestions} sugestão${suggestions === 1 ? "" : "ões"}`} />
        <MetricCard label="Utilizadas" value={used} detail={`${percent(used, recent.length)} das gerações`} />
        <MetricCard label="Sem edição" value={unchanged} detail={`${percent(unchanged, used)} das utilizadas`} />
        <MetricCard label="Editadas" value={edited} detail={`${percent(edited, used)} das utilizadas`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-rosa/15 bg-white p-5 shadow-sm">
          <h2 className="font-serif text-lg font-bold text-texto">Sinal de qualidade</h2>
          <p className="mt-1 text-xs leading-5 text-cinza">
            O objetivo não é eliminar edição humana. Esta métrica mostra se o prompt está ajudando ou gerando retrabalho.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniMetric label="Não utilizadas" value={unused} detail={percent(unused, recent.length)} />
            <MiniMetric label="Taxa de uso" value={percent(used, recent.length)} detail="últimos 30 dias" />
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 rounded-xl bg-creme px-3 py-3 text-xs text-cinza">
              Ainda não há gerações registradas. Os indicadores começam a aparecer assim que o assistente for usado.
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-rosa/15 bg-white p-5 shadow-sm">
          <h2 className="font-serif text-lg font-bold text-texto">Configuração ativa</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <ConfigRow label="Modelo" value={getGeminiModel()} />
            <ConfigRow label="Descrição" value={PRODUCT_DESCRIPTION_PROMPT_VERSION} />
            <ConfigRow label="Divulgação" value={PROMOTION_COPY_PROMPT_VERSION} />
            <ConfigRow label="Armazenamento do Gemini" value="desativado (store: false)" />
            <ConfigRow label="Conteúdo das sugestões no banco" value="não armazenado" />
          </dl>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-rosa/15 bg-white p-5 shadow-sm">
          <h2 className="font-serif text-lg font-bold text-texto">Uso por recurso</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-rosa/10">
            {byFeature.length ? byFeature.map((item) => (
              <div key={item.feature} className="flex items-center justify-between gap-3 border-b border-rosa/10 px-3 py-3 last:border-b-0">
                <span className="text-sm font-semibold text-texto">{featureLabel(item.feature)}</span>
                <span className="text-xs text-cinza">
                  {item._count._all} gerações · {item._sum.suggestionCount ?? 0} sugestões
                </span>
              </div>
            )) : (
              <p className="px-3 py-4 text-xs text-cinza">Sem dados ainda.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-rosa/15 bg-white p-5 shadow-sm">
          <h2 className="font-serif text-lg font-bold text-texto">Modelo × prompt</h2>
          <p className="mt-1 text-xs leading-5 text-cinza">
            Mantemos modelo e prompt separados para identificar regressões quando um deles mudar.
          </p>
          <div className="mt-3 overflow-hidden rounded-xl border border-rosa/10">
            {byModel.length ? byModel.map((item) => (
              <div key={`${item.model}-${item.promptVersion}`} className="border-b border-rosa/10 px-3 py-3 last:border-b-0">
                <p className="text-xs font-bold text-texto">{item.model}</p>
                <p className="mt-0.5 text-[11px] text-cinza">{item.promptVersion} · {item._count._all} gerações</p>
              </div>
            )) : (
              <p className="px-3 py-4 text-xs text-cinza">Sem dados ainda.</p>
            )}
          </div>
        </div>
      </section>

      <p className="text-[11px] leading-5 text-cinza">
        Histórico total: {all._count._all} gerações e {all._sum.suggestionCount ?? 0} sugestões. Nenhum texto gerado é armazenado nesta telemetria.
      </p>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return (
    <div className="rounded-2xl border border-rosa/15 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">{label}</p>
      <p className="mt-2 text-2xl font-black text-texto">{value}</p>
      <p className="mt-1 text-[11px] text-cinza">{detail}</p>
    </div>
  );
}

function MiniMetric({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return (
    <div className="rounded-xl bg-creme p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">{label}</p>
      <p className="mt-1 text-lg font-black text-texto">{value}</p>
      <p className="text-[10px] text-cinza">{detail}</p>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-rosa/10 pb-2 last:border-b-0">
      <dt className="text-cinza">{label}</dt>
      <dd className="text-right text-xs font-bold text-texto">{value}</dd>
    </div>
  );
}
