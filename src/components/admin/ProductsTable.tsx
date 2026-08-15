"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { money } from "@/lib/money";
import { computeStockStatus, STOCK_LABEL } from "@/lib/stock";

type Row = {
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
  categoryId: string;
  category: { name: string };
};

export function ProductsTable({ products }: { products: Row[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.brand.toLowerCase().includes(query.toLowerCase())
  );

  async function toggleActive(p: Row) {
    setTogglingId(p.id);
    await fetch(`/api/admin/products/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: p.name,
        brand: p.brand,
        price: p.price,
        promoPrice: p.promoPrice,
        stockQty: p.stockQty,
        featured: p.featured,
        isNew: p.isNew,
        bestSeller: p.bestSeller,
        active: !p.active,
        categoryId: p.categoryId,
      }),
    });
    setTogglingId(null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou marca..."
          className="flex-1 rounded-full border border-rosa/20 px-4 py-2 text-sm outline-none"
        />
        <Link
          href="/admin/produtos/novo"
          className="text-xs font-bold px-3 py-2 rounded-full text-white whitespace-nowrap"
          style={{ backgroundColor: "#E4127B" }}
        >
          + Novo produto
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((p) => {
          const stock = computeStockStatus(p.stockQty);
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 bg-white rounded-xl p-3"
              style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)", opacity: p.active ? 1 : 0.5 }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-texto truncate">{p.name}</p>
                <p className="text-xs text-cinza">
                  {p.brand} · {p.category.name} · {STOCK_LABEL[stock]}
                </p>
                <p className="text-xs font-bold text-rosa-profundo">
                  {money(p.promoPrice ?? p.price)}
                </p>
              </div>
              <button
                onClick={() => toggleActive(p)}
                disabled={togglingId === p.id}
                className="text-xs font-bold px-2 py-1 rounded-full border border-rosa/20 text-texto whitespace-nowrap"
              >
                {p.active ? "Desativar" : "Ativar"}
              </button>
              <Link
                href={`/admin/produtos/${p.id}`}
                className="text-xs font-bold px-2 py-1 rounded-full text-white whitespace-nowrap"
                style={{ backgroundColor: "#131B33" }}
              >
                Editar
              </Link>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-xs text-cinza">Nenhum produto encontrado.</p>}
      </div>
    </div>
  );
}
