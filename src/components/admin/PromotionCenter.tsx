"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock3,
  Copy,
  ExternalLink,
  Megaphone,
  RefreshCw,
  Share2,
  Sparkles,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  brand: string;
  price: number;
  promoPrice: number | null;
  stockQty: number;
  active: boolean;
  featured: boolean;
  isNew: boolean;
  bestSeller: boolean;
  createdAt: string;
  category: { name: string };
};

type Template = "oferta" | "novidade" | "ultimas";

type QueueItem = {
  time: string;
  productId: string;
  template: Template;
  done: boolean;
};

const QUEUE_KEY = "sra-make-divulgacao-queue-v1";
const HISTORY_KEY = "sra-make-divulgacao-history-v1";
const TIMES = ["09:00", "12:00", "15:00", "18:00", "20:00"];

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function buildMessage(product: Product, template: Template, productUrl: string) {
  const salePrice = product.promoPrice ?? product.price;

  const headline =
    template === "novidade"
      ? "✨ NOVIDADE NA SRA MAKE"
      : template === "ultimas"
        ? "⚠️ ÚLTIMAS UNIDADES"
        : "🔥 OFERTA SRA MAKE";

  const priceBlock = product.promoPrice
    ? `De ${money(product.price)}\nPor *${money(product.promoPrice)}*`
    : `Por *${money(salePrice)}*`;

  const urgency =
    template === "ultimas"
      ? `Restam ${product.stockQty} unidade${product.stockQty === 1 ? "" : "s"}.`
      : template === "novidade"
        ? "Chegou novidade por aqui."
        : "Aproveite enquanto temos estoque.";

  return [
    headline,
    "",
    `💄 *${product.name}*`,
    product.brand ? `${product.brand}` : "",
    "",
    priceBlock,
    "",
    urgency,
    "",
    `🛒 Veja no catálogo:\n${productUrl}`,
    "",
    "📍 Sra Make Prudente",
    "Retirada ou entrega em Presidente Prudente.",
  ]
    .filter(Boolean)
    .join("\n");
}

function pickTemplate(product: Product): Template {
  if (product.stockQty <= 5) return "ultimas";
  if (product.isNew) return "novidade";
  return "oferta";
}

function scoreProduct(product: Product, recentIds: Set<string>) {
  let score = 0;
  if (product.promoPrice) score += 6;
  if (product.isNew) score += 5;
  if (product.featured) score += 4;
  if (product.bestSeller) score += 3;
  if (product.stockQty >= 10) score += 2;
  if (product.stockQty <= 5) score += 3;
  if (recentIds.has(product.id)) score -= 20;
  return score;
}

function buildQueue(products: Product[], recentIds: string[]): QueueItem[] {
  const recent = new Set(recentIds.slice(-12));
  const available = products.filter((product) => product.active && product.stockQty > 0);
  const sorted = [...available].sort((a, b) => scoreProduct(b, recent) - scoreProduct(a, recent));
  const chosen: Product[] = [];
  const usedCategories = new Set<string>();

  for (const product of sorted) {
    if (chosen.length >= TIMES.length) break;
    if (!usedCategories.has(product.category.name) || chosen.length >= 3) {
      chosen.push(product);
      usedCategories.add(product.category.name);
    }
  }

  for (const product of sorted) {
    if (chosen.length >= TIMES.length) break;
    if (!chosen.some((item) => item.id === product.id)) chosen.push(product);
  }

  return chosen.map((product, index) => ({
    time: TIMES[index],
    productId: product.id,
    template: pickTemplate(product),
    done: false,
  }));
}

export function PromotionCenter({ products }: { products: Product[] }) {
  const availableProducts = useMemo(
    () => products.filter((product) => product.active && product.stockQty > 0),
    [products],
  );

  const [productId, setProductId] = useState(availableProducts[0]?.id ?? "");
  const [template, setTemplate] = useState<Template>("oferta");
  const [copied, setCopied] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as string[];
    const savedQueue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]") as QueueItem[];
    setHistory(savedHistory);
    setQueue(savedQueue.length ? savedQueue : buildQueue(products, savedHistory));
  }, [products]);

  useEffect(() => {
    if (queue.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }, [queue]);

  const product = availableProducts.find((item) => item.id === productId);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const productUrl = product
    ? `${origin}/produto/${product.id}?utm_source=whatsapp&utm_medium=organic&utm_campaign=central_divulgacao`
    : "";
  const message = product ? buildMessage(product, template, productUrl) : "";

  function regenerateQueue() {
    setQueue(buildQueue(products, history));
  }

  function openQueueItem(item: QueueItem) {
    setProductId(item.productId);
    setTemplate(item.template);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function markDone(index: number) {
    const item = queue[index];
    if (!item) return;

    const nextQueue = queue.map((row, rowIndex) =>
      rowIndex === index ? { ...row, done: !row.done } : row,
    );
    setQueue(nextQueue);

    if (!item.done) {
      const nextHistory = [...history, item.productId].slice(-30);
      setHistory(nextHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    }
  }

  async function copyMessage() {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareMessage() {
    if (!product || !message) return;

    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: message, url: productUrl });
        return;
      } catch {
        // Cancelamento da folha de compartilhamento não exige tratamento.
      }
    }

    await copyMessage();
  }

  function openWhatsApp() {
    if (!message) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
        <section className="rounded-2xl border border-rosa/15 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl bg-rosa/10 p-2.5 text-rosa-profundo">
              <Megaphone size={20} />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-texto">Criar divulgação</h2>
              <p className="mt-1 text-sm text-cinza">Escolha um produto ou abra uma sugestão da fila do dia.</p>
            </div>
          </div>

          {availableProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-rosa/25 bg-creme p-5 text-sm text-cinza">
              Nenhum produto ativo com estoque disponível para divulgar.
            </div>
          ) : (
            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-cinza">Produto</span>
                <select
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  className="w-full rounded-xl border border-rosa/20 bg-white px-3 py-3 text-sm text-texto outline-none focus:border-rosa-profundo"
                >
                  {availableProducts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — {item.category.name} — {item.stockQty} em estoque
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-cinza">Modelo</span>
                <div className="grid grid-cols-3 gap-2">
                  {([[
                    "oferta",
                    "Oferta",
                  ], ["novidade", "Novidade"], ["ultimas", "Últimas unidades"]] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTemplate(value)}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                        template === value
                          ? "border-rosa-profundo bg-rosa-profundo text-white"
                          : "border-rosa/20 bg-white text-cinza hover:bg-creme"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {product && (
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-creme p-4 text-sm">
                  <div>
                    <p className="text-xs text-cinza">Preço</p>
                    <p className="font-bold text-texto">{money(product.promoPrice ?? product.price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-cinza">Estoque</p>
                    <p className="font-bold text-texto">{product.stockQty} un.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-rosa/15 bg-white p-5 shadow-sm">
          <h2 className="font-serif text-lg font-bold text-texto">Prévia da mensagem</h2>
          <p className="mt-1 text-sm text-cinza">Revise antes de compartilhar.</p>

          <div className="mt-4 min-h-[320px] whitespace-pre-wrap rounded-2xl border border-rosa/15 bg-creme p-4 text-sm leading-6 text-texto">
            {message || "Selecione um produto para gerar a divulgação."}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button type="button" disabled={!message} onClick={copyMessage} className="flex items-center justify-center gap-2 rounded-xl border border-rosa/20 px-3 py-3 text-xs font-bold text-rosa-profundo transition hover:bg-creme disabled:opacity-40">
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copiado" : "Copiar"}
            </button>
            <button type="button" disabled={!message} onClick={shareMessage} className="flex items-center justify-center gap-2 rounded-xl border border-rosa/20 px-3 py-3 text-xs font-bold text-rosa-profundo transition hover:bg-creme disabled:opacity-40">
              <Share2 size={16} /> Compartilhar
            </button>
            <button type="button" disabled={!message} onClick={openWhatsApp} className="flex items-center justify-center gap-2 rounded-xl bg-rosa-profundo px-3 py-3 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-40">
              <ExternalLink size={16} /> WhatsApp
            </button>
          </div>

          <p className="mt-3 text-[11px] leading-4 text-cinza">
            A publicação continua sob confirmação humana. Nenhum robô acessa a conta da loja.
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-rosa/15 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-rosa/10 p-2.5 text-rosa-profundo"><Sparkles size={20} /></div>
            <div>
              <h2 className="font-serif text-lg font-bold text-texto">Fila sugerida de hoje</h2>
              <p className="mt-1 text-sm text-cinza">
                Prioriza promoções, novidades, destaques e estoque, evitando repetir produtos recentes.
              </p>
            </div>
          </div>
          <button type="button" onClick={regenerateQueue} className="flex items-center gap-2 rounded-xl border border-rosa/20 px-3 py-2.5 text-xs font-bold text-rosa-profundo hover:bg-creme">
            <RefreshCw size={15} /> Gerar nova fila
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {queue.length === 0 ? (
            <div className="rounded-xl border border-dashed border-rosa/25 bg-creme p-5 text-sm text-cinza">
              Não há produtos suficientes para montar a fila de hoje.
            </div>
          ) : (
            queue.map((item, index) => {
              const queueProduct = products.find((product) => product.id === item.productId);
              if (!queueProduct) return null;

              return (
                <div key={`${item.time}-${item.productId}`} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${item.done ? "border-rosa/10 bg-creme opacity-70" : "border-rosa/15 bg-white"}`}>
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex shrink-0 items-center gap-1 rounded-lg bg-creme px-2.5 py-2 text-xs font-bold text-texto">
                      <Clock3 size={14} /> {item.time}
                    </div>
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-bold text-texto ${item.done ? "line-through" : ""}`}>{queueProduct.name}</p>
                      <p className="mt-0.5 text-xs text-cinza">
                        {queueProduct.category.name} · {item.template === "ultimas" ? "Últimas unidades" : item.template === "novidade" ? "Novidade" : "Oferta"} · {queueProduct.stockQty} un.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openQueueItem(item)} className="rounded-lg border border-rosa/20 px-3 py-2 text-xs font-bold text-rosa-profundo hover:bg-creme">
                      Abrir
                    </button>
                    <button type="button" onClick={() => markDone(index)} className={`rounded-lg px-3 py-2 text-xs font-bold ${item.done ? "border border-rosa/20 text-rosa-profundo" : "bg-rosa-profundo text-white"}`}>
                      {item.done ? "Desmarcar" : "Publicado"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
