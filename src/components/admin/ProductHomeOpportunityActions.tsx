"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type MerchandisingSettings = {
  featuredOrder: string[];
  newOrder: string[];
  hiddenOffers: string[];
  hiddenFeatured: string[];
  hiddenPopular: string[];
  hiddenNew: string[];
};

type Props = {
  productId: string;
  featured: boolean;
  isNew: boolean;
  bestSeller: boolean;
  hasOffer: boolean;
  settings: MerchandisingSettings;
};

type QuickSection = "featured" | "popular" | "new" | "hide";

function withoutId(ids: string[], productId: string) {
  return ids.filter((id) => id !== productId);
}

function withId(ids: string[], productId: string) {
  return ids.includes(productId) ? ids : [...ids, productId];
}

export function ProductHomeOpportunityActions({
  productId,
  featured,
  isNew,
  bestSeller,
  hasOffer,
  settings,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState<QuickSection | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function updateProductTag(field: "featured" | "isNew" | "bestSeller") {
    const response = await fetch(`/api/admin/products/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: true }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Não foi possível atualizar a tag do produto.");
  }

  async function updateHome(body: Record<string, unknown>) {
    const response = await fetch("/api/admin/home-merchandising", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Não foi possível atualizar a Home.");
  }

  async function apply(section: QuickSection) {
    if (saving) return;
    setSaving(section);
    setMessage(null);

    try {
      if (section === "featured") {
        if (!featured) await updateProductTag("featured");
        await updateHome({
          featuredOrder: [productId, ...withoutId(settings.featuredOrder, productId)],
          hiddenFeatured: withoutId(settings.hiddenFeatured, productId),
        });
        setMessage("Produto colocado em Destaques e priorizado no topo.");
      }

      if (section === "popular") {
        if (!bestSeller) await updateProductTag("bestSeller");
        await updateHome({
          hiddenPopular: withoutId(settings.hiddenPopular, productId),
        });
        setMessage("Produto habilitado em Mais procurados. A ordem continua automática.");
      }

      if (section === "new") {
        if (!isNew) await updateProductTag("isNew");
        await updateHome({
          newOrder: [productId, ...withoutId(settings.newOrder, productId)],
          hiddenNew: withoutId(settings.hiddenNew, productId),
        });
        setMessage("Produto colocado em Novidades e priorizado no topo.");
      }

      if (section === "hide") {
        await updateHome({
          hiddenOffers: withId(settings.hiddenOffers, productId),
          hiddenFeatured: withId(settings.hiddenFeatured, productId),
          hiddenPopular: withId(settings.hiddenPopular, productId),
          hiddenNew: withId(settings.hiddenNew, productId),
        });
        setMessage("Produto ocultado das vitrines principais da Home.");
      }

      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a Home.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="mt-3 border-t border-rosa/10 pt-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-cinza">Atualizar Home</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void apply("featured")}
          disabled={Boolean(saving)}
          className="min-h-10 rounded-xl border border-rosa/20 bg-white px-2 text-[11px] font-bold text-rosa-profundo disabled:opacity-50"
        >
          {saving === "featured" ? "Salvando..." : featured ? "Priorizar destaque" : "+ Destaques"}
        </button>
        <button
          type="button"
          onClick={() => void apply("popular")}
          disabled={Boolean(saving)}
          className="min-h-10 rounded-xl border border-rosa/20 bg-white px-2 text-[11px] font-bold text-rosa-profundo disabled:opacity-50"
        >
          {saving === "popular" ? "Salvando..." : bestSeller ? "Manter procurado" : "+ Mais procurados"}
        </button>
        <button
          type="button"
          onClick={() => void apply("new")}
          disabled={Boolean(saving)}
          className="min-h-10 rounded-xl border border-rosa/20 bg-white px-2 text-[11px] font-bold text-rosa-profundo disabled:opacity-50"
        >
          {saving === "new" ? "Salvando..." : isNew ? "Priorizar novidade" : "+ Novidades"}
        </button>
        <button
          type="button"
          onClick={() => void apply("hide")}
          disabled={Boolean(saving)}
          className="min-h-10 rounded-xl border border-red-200 bg-red-50 px-2 text-[11px] font-bold text-red-700 disabled:opacity-50"
        >
          {saving === "hide" ? "Salvando..." : "Ocultar da Home"}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px]">
        {hasOffer && <span className="font-bold text-green-700">Oferta ativa pelo preço promocional</span>}
        <Link href="/admin/loja/vitrine" className="font-bold text-rosa-profundo underline underline-offset-2">
          Organizar vitrines
        </Link>
      </div>
      {message && <p className="mt-2 text-[10px] leading-relaxed text-cinza">{message}</p>}
    </div>
  );
}
