"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Eye, EyeOff, GripVertical, RotateCcw } from "lucide-react";
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
type OrderableTab = Exclude<Tab, "popular">;
type Notice = { tone: "success" | "error"; message: string } | null;

function ordered<T extends { id: string }>(items: T[], ids: string[]) {
  const configuredIndex = new Map(ids.map((id, position) => [id, position] as const));
  const sourceIndex = new Map(items.map((item, position) => [item.id, position] as const));

  return [...items].sort((a, b) => {
    const aIndex = configuredIndex.get(a.id);
    const bIndex = configuredIndex.get(b.id);
    if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex;
    if (aIndex !== undefined) return -1;
    if (bIndex !== undefined) return 1;
    return (sourceIndex.get(a.id) ?? 0) - (sourceIndex.get(b.id) ?? 0);
  });
}

function moveById<T extends { id: string }>(items: T[], sourceId: string, targetId: string) {
  const from = items.findIndex((item) => item.id === sourceId);
  const to = items.findIndex((item) => item.id === targetId);
  if (from < 0 || to < 0 || from === to) return items;

  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function sameOrder<T extends { id: string }>(a: T[], b: T[]) {
  return a.length === b.length && a.every((item, index) => item.id === b[index]?.id);
}

export function HomeProductMerchandisingManager({
  products,
  offerOrder,
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
  offerOrder: string[];
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
  const [offerItems, setOfferItems] = useState(() => ordered(offerProducts, offerOrder));
  const [featuredItems, setFeaturedItems] = useState(() => ordered(featuredProducts, featuredOrder));
  const [newItems, setNewItems] = useState(() => ordered(newProducts, newOrder));
  const [hiddenOffersState, setHiddenOffersState] = useState(hiddenOffers);
  const [hiddenFeaturedState, setHiddenFeaturedState] = useState(hiddenFeatured);
  const [hiddenPopularState, setHiddenPopularState] = useState(hiddenPopular);
  const [hiddenNewState, setHiddenNewState] = useState(hiddenNew);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [dragging, setDragging] = useState<{ section: OrderableTab; id: string } | null>(null);

  const offerItemsRef = useRef(offerItems);
  const featuredItemsRef = useRef(featuredItems);
  const newItemsRef = useRef(newItems);
  const dragSnapshotRef = useRef<HomeProduct[] | null>(null);

  function itemsFor(section: OrderableTab) {
    if (section === "offers") return offerItemsRef.current;
    if (section === "featured") return featuredItemsRef.current;
    return newItemsRef.current;
  }

  function baseItemsFor(section: OrderableTab) {
    if (section === "offers") return offerProducts;
    if (section === "featured") return featuredProducts;
    return newProducts;
  }

  function updateItems(section: OrderableTab, next: HomeProduct[]) {
    if (section === "offers") {
      offerItemsRef.current = next;
      setOfferItems(next);
    } else if (section === "featured") {
      featuredItemsRef.current = next;
      setFeaturedItems(next);
    } else {
      newItemsRef.current = next;
      setNewItems(next);
    }
  }

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

  function orderBody(section: OrderableTab, items: HomeProduct[]) {
    const ids = items.map((item) => item.id);
    if (section === "offers") return { offerOrder: ids };
    if (section === "featured") return { featuredOrder: ids };
    return { newOrder: ids };
  }

  function resetOrderBody(section: OrderableTab) {
    if (section === "offers") return { offerOrder: [] };
    if (section === "featured") return { featuredOrder: [] };
    return { newOrder: [] };
  }

  function beginProductDrag(section: OrderableTab, id: string) {
    if (saving) return;
    if (!dragSnapshotRef.current) dragSnapshotRef.current = [...itemsFor(section)];
    setDragging({ section, id });
    setNotice(null);
  }

  function dragProductOver(section: OrderableTab, targetId: string) {
    if (!dragging || dragging.section !== section || dragging.id === targetId) return;
    const next = moveById(itemsFor(section), dragging.id, targetId);
    updateItems(section, next);
  }

  async function finishProductDrag(section: OrderableTab) {
    const previous = dragSnapshotRef.current;
    const next = itemsFor(section);
    dragSnapshotRef.current = null;
    setDragging(null);
    if (!previous || sameOrder(previous, next)) return;

    const ok = await save(orderBody(section, next), "Ordem da vitrine atualizada.");
    if (!ok) updateItems(section, previous);
  }

  function handleProductTouchMove(event: React.TouchEvent) {
    if (!dragging) return;
    event.preventDefault();
    const touch = event.touches[0];
    const target = document
      .elementFromPoint(touch.clientX, touch.clientY)
      ?.closest<HTMLElement>("[data-product-drag-id]");
    const targetId = target?.dataset.productDragId;
    const targetSection = target?.dataset.productDragSection as OrderableTab | undefined;
    if (targetId && targetSection === dragging.section) {
      dragProductOver(dragging.section, targetId);
    }
  }

  async function reset(section: OrderableTab) {
    if (saving) return;
    const current = itemsFor(section);
    const next = [...baseItemsFor(section)];
    updateItems(section, next);

    const ok = await save(resetOrderBody(section), "Ordem automática restaurada.");
    if (!ok) updateItems(section, current);
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
      ? offerItems
      : tab === "featured"
        ? featuredItems
        : tab === "popular"
          ? popularPreview
          : newItems;
  const currentHidden = new Set(hiddenFor(tab));
  const visibleCount = currentItems.filter((product) => !currentHidden.has(product.id)).length;
  const orderableTab: OrderableTab | null = tab === "popular" ? null : tab;

  return (
    <section className="rounded-3xl border border-rosa/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rosa-profundo">Merchandising</p>
          <h2 className="mt-1 font-serif text-xl font-bold text-texto">Produtos da Home</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-cinza">
            A Home não muda de estrutura. Ofertas continuam vindo do preço promocional; Destaques, Mais procurados e Novidades continuam usando as tags. Aqui você escolhe o que aparece e arrasta as vitrines editoriais para definir a posição.
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
            <strong className="text-texto">Ofertas continua automática:</strong> qualquer produto com preço promocional menor que o preço normal entra aqui. O ADM pode mostrar ou ocultar e arrastar para escolher a ordem.
          </>
        )}
        {tab === "featured" && (
          <>
            <strong className="text-texto">Destaques mantém a tag Destaque:</strong> escolha quais itens ficam visíveis e segure no ícone para arrastar até a posição desejada.
          </>
        )}
        {tab === "popular" && (
          <>
            <strong className="text-texto">Mais procurados mantém a tag Mais vendido:</strong>{" "}
            {popularityEnoughData
              ? `há dados suficientes para ordenar os itens marcados pelo comportamento real (${popularitySessions} sessões e ${popularitySignals} sinais). Por isso esta aba não tem ordem manual.`
              : `o tráfego ainda é baixo (${popularitySessions} sessões e ${popularitySignals} sinais), então a própria tag continua sendo a referência. A ordem ficará automática para evoluir com as clientes.`}
          </>
        )}
        {tab === "new" && (
          <>
            <strong className="text-texto">Novidades mantém a tag Novidade:</strong> escolha quais itens ficam visíveis e segure no ícone para arrastar até a posição desejada.
          </>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-cinza">
          {visibleCount} de {currentItems.length} produto(s) aparecem nesta vitrine.
        </p>
        {orderableTab && (
          <button
            type="button"
            onClick={() => void reset(orderableTab)}
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
                data-product-drag-id={orderableTab ? product.id : undefined}
                data-product-drag-section={orderableTab ?? undefined}
                onDragEnter={() => {
                  if (orderableTab) dragProductOver(orderableTab, product.id);
                }}
                onDragOver={(event) => {
                  if (orderableTab) event.preventDefault();
                }}
                className={`flex items-center gap-2 rounded-2xl border p-2.5 transition ${
                  visible ? "border-rosa/10 bg-white" : "border-dashed border-cinza/20 bg-creme/50 opacity-75"
                } ${dragging?.id === product.id ? "bg-creme/80 shadow-sm" : ""}`}
              >
                {orderableTab && (
                  <button
                    type="button"
                    draggable={!saving}
                    onDragStart={() => beginProductDrag(orderableTab, product.id)}
                    onDragEnd={() => void finishProductDrag(orderableTab)}
                    onTouchStart={() => beginProductDrag(orderableTab, product.id)}
                    onTouchMove={handleProductTouchMove}
                    onTouchEnd={() => void finishProductDrag(orderableTab)}
                    disabled={saving}
                    className="flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg border border-rosa/15 text-cinza active:cursor-grabbing disabled:opacity-30"
                    aria-label={`Arrastar ${product.name}`}
                  >
                    <GripVertical size={16} />
                  </button>
                )}

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
                  onClick={() => void toggleVisibility(tab, product.id)}
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
