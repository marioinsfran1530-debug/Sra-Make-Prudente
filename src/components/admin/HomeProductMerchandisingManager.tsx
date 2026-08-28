"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, RotateCcw } from "lucide-react";
import { AdminNotice } from "@/components/admin/AdminUx";
import { money } from "@/lib/money";

type HomeProduct = {
  id: string;
  name: string;
  brand: string;
  price: number;
  promoPrice: number | null;
  stockQty: number;
  imageUrl: string | null;
  featured: boolean;
  isNew: boolean;
  bestSeller: boolean;
};

type PopularPreview = HomeProduct & {
  score: number;
  source: "CLIENTES" | "TAG";
};

type Tab = "offers" | "featured" | "popular" | "new";
type Notice = { tone: "success" | "error"; message: string } | null;

function ordered<T extends { id: string; name: string }>(items: T[], ids: string[]) {
  const index = new Map(ids.map((id, position) => [id, position] as const));
  return [...items].sort((a, b) => {
    const aIndex = index.get(a.id);
    const bIndex = index.get(b.id);
    if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex;
    if (aIndex !== undefined) return -1;
    if (bIndex !== undefined) return 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

export function HomeProductMerchandisingManager({
  products,
  featuredOrder,
  newOrder,
  hiddenOffers,
  hiddenFeatured,
  hiddenPopular,
  hiddenNew,
  popularPreview,
  popularityEnoughData,
  popularitySessions,
  popularitySignals,
}: {
  products: HomeProduct[];
  featuredOrder: string[];
  newOrder: string[];
  hiddenOffers: string[];
  hiddenFeatured: string[];
  hiddenPopular: string[];
  hiddenNew: string[];
  popularPreview: PopularPreview[];
  popularityEnoughData: boolean;
  popularitySessions: number;
  popularitySignals: number;
}) {
  const offerProducts = useMemo(
    () => products.filter((product) => product.promoPrice !== null && product.promoPrice < product.price),
    [products]
  );
  const featuredProducts = useMemo(
    () => products.filter((product) => product.featured),
    [products]
  );
  const newProducts = useMemo(
    () => products.filter((product) => product.isNew),
    [products]
  );

  const [tab, setTab] = useState<Tab>("offers");
  const [featuredItems, setFeaturedItems] = useState(() => ordered(featuredProducts, featuredOrder));
  const [newItems, setNewItems] = useState(() => ordered(newProducts, newOrder));
  const [hiddenOffersState, setHiddenOffersState] = useState(hiddenOffers);
  const [hiddenFeaturedState, setHiddenFeaturedState] = useState(hiddenFeatured);
  const [hiddenPopularState, setHiddenPopularState] = useState(hiddenPopular);
  const [hiddenNewState, setHiddenNewState] = useState(hiddenNew);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  async function save(body: Record<string, unknown>, successMessage: string) {
    if (saving) return false;
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/home-merchandising", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar a vitrine.");
      setNotice({ tone: "success", message: successMessage });
      return true;
    } catch (reason) {
      setNotice({
        tone: "error",
        message: reason instanceof Error ? reason.message : "Não foi possível salvar a vitrine.",
      });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function persistOrder(kind: "featured" | "new", items: HomeProduct[]) {
    return save(
      kind === "featured"
        ? { featuredOrder: items.map((item) => item.id) }
        : { newOrder: items.map((item) => item.id) },
      "Posições da vitrine atualizadas."
    );
  }

  async function move(kind: "featured" | "new", index: number, direction: -1 | 1) {
    const source = kind === "featured" ? featuredItems : newItems;
    const target = index + direction;
    if (target < 0 || target >= source.length || saving) return;

    const next = [...source];
    [next[index], next[target]] = [next[target], next[index]];
    if (kind === "featured") setFeaturedItems(next);
    else setNewItems(next);

    const ok = await persistOrder(kind, next);
    if (!ok) {
      if (kind === "featured") setFeaturedItems(source);
      else setNewItems(source);
    }
  }

  async function reset(kind: "featured" | "new") {
    if (saving) return;
    const current = kind === "featured" ? featuredItems : newItems;
    const base = kind === "featured" ? featuredProducts : newProducts;
    const next = [...base].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    if (kind === "featured") setFeaturedItems(next);
    else setNewItems(next);

    const ok = await save(
      kind === "featured" ? { featuredOrder: [] } : { newOrder: [] },
      "Ordem automática restaurada."
    );
    if (!ok) {
      if (kind === "featured") setFeaturedItems(current);
      else setNewItems(current);
    }
  }

  function hiddenFor(section: Tab) {
    if (section === "offers") return hiddenOffersState;
    if (section === "featured") return hiddenFeaturedState;
    if (section === "popular") return hiddenPopularState;
    return hiddenNewState;
  }

  function setHiddenFor(section: Tab, next: string[]) {
    if (section === "offers") setHiddenOffersState(next);
    else if (section === "featured") setHiddenFeaturedState(next);
    else if (section === "popular") setHiddenPopularState(next);
    else setHiddenNewState(next);
  }

  function hiddenBody(section: Tab, next: string[]) {
    if (section === "offers") return { hiddenOffers: next };
    if (section === "featured") return { hiddenFeatured: next };
    if (section === "popular") return { hiddenPopular: next };
    return { hiddenNew: next };
  }

  async function toggleVisibility(section: Tab, productId: string) {
    if (saving) return;
    const previous = hiddenFor(section);
    const hidden = new Set(previous);
    if (hidden.has(productId)) hidden.delete(productId);
    else hidden.add(productId);
    const next = [...hidden];
    setHiddenFor(section, next);

    const ok = await save(
      hiddenBody(section, next),
      hidden.has(productId) ? "Produto ocultado desta vitrine." : "Produto exibido nesta vitrine."
    );
    if (!ok) setHiddenFor(section, previous);
  }

  const currentItems: Array<HomeProduct | PopularPreview> =
    tab === "offers"
      ? offerProducts
      : tab === "featured"
        ? featuredItems
        : tab === "popular"
          ? popularPreview
          : newItems;
  const currentHidden = new Set(hiddenFor(tab));
  const visibleCount = currentItems.filter((product) => !currentHidden.has(product.id)).length;

  return (
    <section className="rounded-3xl border border-rosa/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rosa-profundo">Merchandising</p>
          <h2 className="mt-1 font-serif text-xl font-bold text-texto">Produtos da Home</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-cinza">
            A Home não muda de estrutura. Ofertas continuam vindo do preço promocional; Destaques, Mais procurados e Novidades continuam usando as tags. Aqui você decide apenas o que aparece e, onde faz sentido, a posição.
          </p>
        </div>
        <Link
          href="/admin/produtos"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-rosa/20 px-3 text-xs font-bold text-rosa-profundo"
        >
          Editar produtos e tags
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-creme p-1.5 sm:grid-cols-4">
        {[
          ["offers", "Ofertas"],
          ["featured", "Destaques"],
          ["popular", "Mais procurados"],
          ["new", "Novidades"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value as Tab)}
            className={`min-h-10 rounded-xl px-2 text-[11px] font-bold transition ${
              tab === value ? "bg-white text-rosa-profundo shadow-sm" : "text-cinza"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {notice && (
        <div className="mt-4">
          <AdminNotice tone={notice.tone}>{notice.message}</AdminNotice>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-rosa/10 bg-creme/40 p-3 text-xs leading-relaxed text-cinza">
        {tab === "offers" && (
          <>
            <strong className="text-texto">Ofertas continua automática:</strong> qualquer produto com preço promocional menor que o preço normal entra nesta vitrine. O ADM pode apenas mostrar ou ocultar o item daqui.
          </>
        )}
        {tab === "featured" && (
          <>
            <strong className="text-texto">Destaques mantém a tag Destaque:</strong> escolha quais itens ficam visíveis e use as setas para definir a posição.
          </>
        )}
        {tab === "popular" && (
          <>
            <strong className="text-texto">Mais procurados mantém a tag Mais vendido:</strong>{" "}
            {popularityEnoughData
              ? `há dados suficientes para ordenar os itens marcados pelo comportamento real (${popularitySessions} sessões e ${popularitySignals} sinais).`
              : `o tráfego ainda é baixo (${popularitySessions} sessões e ${popularitySignals} sinais), então a própria tag continua sendo a referência.`}
          </>
        )}
        {tab === "new" && (
          <>
            <strong className="text-texto">Novidades mantém a tag Novidade:</strong> escolha quais itens ficam visíveis e use as setas para definir a posição.
          </>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-cinza">
          {visibleCount} de {currentItems.length} produto(s) aparecem nesta vitrine.
        </p>
        {(tab === "featured" || tab === "new") && (
          <button
            type="button"
            onClick={() => reset(tab)}
            disabled={saving}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-rosa-profundo disabled:opacity-50"
          >
            <RotateCcw size={13} /> Ordem automática
          </button>
        )}
      </div>

      {currentItems.length === 0 ? (
        <div className="mt-3">
          <Empty
            text={
              tab === "offers"
                ? "Nenhum produto com preço promocional ativo no momento."
                : tab === "featured"
                  ? "Marque produtos como Destaque para organizá-los aqui."
                  : tab === "popular"
                    ? "Marque produtos como Mais vendido para organizá-los aqui."
                    : "Marque produtos como Novidade para organizá-los aqui."
            }
          />
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {currentItems.map((product, index) => {
            const visible = !currentHidden.has(product.id);
            const popular = tab === "popular" ? (product as PopularPreview) : null;
            return (
              <div
                key={product.id}
                className={`flex items-center gap-2 rounded-2xl border p-2.5 ${
                  visible ? "border-rosa/10 bg-white" : "border-dashed border-cinza/20 bg-creme/50 opacity-75"
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-creme text-xs font-extrabold text-rosa-profundo">
                  {index + 1}
                </span>
                <ProductThumb product={product} />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs font-bold leading-tight text-texto">{product.name}</p>
                  <p className="mt-0.5 text-[10px] text-cinza">
                    {product.brand} · {money(product.promoPrice ?? product.price)}
                  </p>
                  {popular && (
                    <p className="mt-1 text-[9px] font-semibold text-cinza">
                      {popular.source === "CLIENTES" ? `Clientes · score ${popular.score}` : "Tag Mais vendido"}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => toggleVisibility(tab, product.id)}
                  disabled={saving}
                  className={`inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border px-2 text-[10px] font-bold disabled:opacity-50 ${
                    visible
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-cinza/20 bg-white text-cinza"
                  }`}
                >
                  {visible ? <Eye size={13} /> : <EyeOff size={13} />}
                  {visible ? "Na Home" : "Oculto"}
                </button>

                {(tab === "featured" || tab === "new") && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      aria-label="Subir produto"
                      disabled={saving || index === 0}
                      onClick={() => move(tab, index, -1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-rosa/15 text-rosa-profundo disabled:opacity-25"
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label="Descer produto"
                      disabled={saving || index === currentItems.length - 1}
                      onClick={() => move(tab, index, 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-rosa/15 text-rosa-profundo disabled:opacity-25"
                    >
                      <ArrowDown size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ProductThumb({ product }: { product: HomeProduct }) {
  return product.imageUrl ? (
    <img
      src={product.imageUrl}
      alt=""
      className="h-12 w-12 shrink-0 rounded-xl border border-rosa/10 object-cover"
      loading="lazy"
    />
  ) : (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-creme text-[9px] font-bold text-cinza">
      Sem foto
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-rosa/20 bg-creme/40 p-4 text-center text-xs text-cinza">
      {text}
    </div>
  );
}
