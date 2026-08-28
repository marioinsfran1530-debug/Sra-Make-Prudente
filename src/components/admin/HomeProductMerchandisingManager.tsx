"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, RotateCcw } from "lucide-react";
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

type Tab = "featured" | "new" | "popular";
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
  popularPreview,
  popularityEnoughData,
  popularitySessions,
  popularitySignals,
}: {
  products: HomeProduct[];
  featuredOrder: string[];
  newOrder: string[];
  popularPreview: PopularPreview[];
  popularityEnoughData: boolean;
  popularitySessions: number;
  popularitySignals: number;
}) {
  const featuredProducts = useMemo(
    () => products.filter((product) => product.featured),
    [products]
  );
  const newProducts = useMemo(
    () => products.filter((product) => product.isNew),
    [products]
  );

  const [tab, setTab] = useState<Tab>("featured");
  const [featuredItems, setFeaturedItems] = useState(() => ordered(featuredProducts, featuredOrder));
  const [newItems, setNewItems] = useState(() => ordered(newProducts, newOrder));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  async function persist(kind: "featured" | "new", items: HomeProduct[]) {
    if (saving) return;
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/home-merchandising", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "featured"
            ? { featuredOrder: items.map((item) => item.id) }
            : { newOrder: items.map((item) => item.id) }
        ),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar a ordem.");
      setNotice({ tone: "success", message: "Posições da vitrine atualizadas." });
    } catch (reason) {
      setNotice({
        tone: "error",
        message: reason instanceof Error ? reason.message : "Não foi possível salvar a ordem.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function move(kind: "featured" | "new", index: number, direction: -1 | 1) {
    const source = kind === "featured" ? featuredItems : newItems;
    const target = index + direction;
    if (target < 0 || target >= source.length || saving) return;

    const next = [...source];
    [next[index], next[target]] = [next[target], next[index]];
    if (kind === "featured") setFeaturedItems(next);
    else setNewItems(next);
    await persist(kind, next);
  }

  async function reset(kind: "featured" | "new") {
    if (saving) return;
    const base = kind === "featured" ? featuredProducts : newProducts;
    const next = [...base].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    if (kind === "featured") setFeaturedItems(next);
    else setNewItems(next);
    await persist(kind, []);
  }

  const currentItems = tab === "featured" ? featuredItems : newItems;

  return (
    <section className="rounded-3xl border border-rosa/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rosa-profundo">Merchandising</p>
          <h2 className="mt-1 font-serif text-xl font-bold text-texto">Produtos da Home</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-cinza">
            As tags de vitrine continuam valendo. Aqui você controla a posição de Destaques e Novidades; Mais procurados combina comportamento real com a tag Mais vendido enquanto o tráfego ainda é baixo.
          </p>
        </div>
        <Link
          href="/admin/produtos"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-rosa/20 px-3 text-xs font-bold text-rosa-profundo"
        >
          Editar tags dos produtos
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-creme p-1.5">
        {[
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

      {notice && <div className="mt-4"><AdminNotice tone={notice.tone}>{notice.message}</AdminNotice></div>}

      {tab === "popular" ? (
        <div className="mt-4">
          <div className={`rounded-2xl border p-3 text-xs ${popularityEnoughData ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
            {popularityEnoughData
              ? `Ranking usando comportamento real dos últimos 30 dias: ${popularitySessions} clientes/sessões e ${popularitySignals} sinais únicos.`
              : `Dados ainda baixos (${popularitySessions} clientes/sessões e ${popularitySignals} sinais únicos). Por enquanto, a tag “Mais vendido” continua sendo a base da vitrine.`}
          </div>

          <div className="mt-3 space-y-2">
            {popularPreview.length === 0 ? (
              <Empty text="Nenhum produto elegível em Mais procurados no momento." />
            ) : (
              popularPreview.map((product, index) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  position={index + 1}
                  badge={product.source === "CLIENTES" ? "Clientes" : "Tag Mais vendido"}
                  score={product.source === "CLIENTES" ? product.score : undefined}
                />
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs text-cinza">
              {tab === "featured"
                ? `${featuredItems.length} produto(s) com a tag Destaque.`
                : `${newItems.length} produto(s) com a tag Novidade.`}
            </p>
            <button
              type="button"
              onClick={() => reset(tab)}
              disabled={saving}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-rosa-profundo disabled:opacity-50"
            >
              <RotateCcw size={13} /> Ordem automática
            </button>
          </div>

          {currentItems.length === 0 ? (
            <Empty text={tab === "featured" ? "Marque produtos como Destaque para organizá-los aqui." : "Marque produtos como Novidade para organizá-los aqui."} />
          ) : (
            <div className="space-y-2">
              {currentItems.map((product, index) => (
                <div key={product.id} className="flex items-center gap-2 rounded-2xl border border-rosa/10 bg-white p-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-creme text-xs font-extrabold text-rosa-profundo">
                    {index + 1}
                  </span>
                  <ProductThumb product={product} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-bold leading-tight text-texto">{product.name}</p>
                    <p className="mt-0.5 text-[10px] text-cinza">{product.brand} · {money(product.promoPrice ?? product.price)}</p>
                  </div>
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ProductRow({
  product,
  position,
  badge,
  score,
}: {
  product: HomeProduct;
  position: number;
  badge: string;
  score?: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-rosa/10 p-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-creme text-xs font-extrabold text-rosa-profundo">{position}</span>
      <ProductThumb product={product} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-xs font-bold leading-tight text-texto">{product.name}</p>
        <p className="mt-0.5 text-[10px] text-cinza">{product.brand} · {money(product.promoPrice ?? product.price)}</p>
      </div>
      <div className="shrink-0 text-right">
        <span className="inline-flex rounded-full bg-creme px-2 py-1 text-[9px] font-bold text-rosa-profundo">{badge}</span>
        {score !== undefined && <p className="mt-1 text-[9px] text-cinza">score {score}</p>}
      </div>
    </div>
  );
}

function ProductThumb({ product }: { product: HomeProduct }) {
  return product.imageUrl ? (
    <img src={product.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-rosa/10 object-cover" loading="lazy" />
  ) : (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-creme text-[9px] font-bold text-cinza">Sem foto</div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-rosa/20 bg-creme/40 p-4 text-center text-xs text-cinza">{text}</div>;
}
