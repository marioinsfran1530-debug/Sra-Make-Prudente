"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Megaphone, Share2 } from "lucide-react";

type Product = {
  id: string;
  name: string;
  brand: string;
  price: number;
  promoPrice: number | null;
  stockQty: number;
  active: boolean;
  category: { name: string };
};

type Template = "oferta" | "novidade" | "ultimas";

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

export function PromotionCenter({ products }: { products: Product[] }) {
  const availableProducts = useMemo(
    () => products.filter((product) => product.active && product.stockQty > 0),
    [products],
  );

  const [productId, setProductId] = useState(availableProducts[0]?.id ?? "");
  const [template, setTemplate] = useState<Template>("oferta");
  const [copied, setCopied] = useState(false);

  const product = availableProducts.find((item) => item.id === productId);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const productUrl = product ? `${origin}/produto/${product.id}?utm_source=whatsapp&utm_medium=organic&utm_campaign=central_divulgacao` : "";
  const message = product ? buildMessage(product, template, productUrl) : "";

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
        await navigator.share({
          title: product.name,
          text: message,
          url: productUrl,
        });
        return;
      } catch {
        // O usuário pode cancelar a folha de compartilhamento sem ser um erro real.
      }
    }

    await copyMessage();
  }

  function openWhatsApp() {
    if (!message) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
      <section className="rounded-2xl border border-rosa/15 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-xl bg-rosa/10 p-2.5 text-rosa-profundo">
            <Megaphone size={20} />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-texto">Criar divulgação</h2>
            <p className="mt-1 text-sm text-cinza">
              Escolha um produto e o catálogo prepara a mensagem para publicar.
            </p>
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
                {([
                  ["oferta", "Oferta"],
                  ["novidade", "Novidade"],
                  ["ultimas", "Últimas unidades"],
                ] as const).map(([value, label]) => (
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
          <button
            type="button"
            disabled={!message}
            onClick={copyMessage}
            className="flex items-center justify-center gap-2 rounded-xl border border-rosa/20 px-3 py-3 text-xs font-bold text-rosa-profundo transition hover:bg-creme disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copiado" : "Copiar"}
          </button>

          <button
            type="button"
            disabled={!message}
            onClick={shareMessage}
            className="flex items-center justify-center gap-2 rounded-xl border border-rosa/20 px-3 py-3 text-xs font-bold text-rosa-profundo transition hover:bg-creme disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Share2 size={16} />
            Compartilhar
          </button>

          <button
            type="button"
            disabled={!message}
            onClick={openWhatsApp}
            className="flex items-center justify-center gap-2 rounded-xl bg-rosa-profundo px-3 py-3 text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ExternalLink size={16} />
            WhatsApp
          </button>
        </div>

        <p className="mt-3 text-[11px] leading-4 text-cinza">
          A publicação continua sob confirmação humana. Nenhum robô acessa a conta da loja.
        </p>
      </section>
    </div>
  );
}
