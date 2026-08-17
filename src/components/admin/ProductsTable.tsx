"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Grid2X2, List } from "lucide-react";
import { money } from "@/lib/money";
import { computeStockStatus, STOCK_LABEL } from "@/lib/stock";

type Row = {
  id: string;
  name: string;
  brand: string;
  sku: string | null;
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

type ViewMode = "list" | "grid";

export function ProductsTable({ products }: { products: Row[] }) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const [tag, setTag] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const map = new Map<string, string>();

    products.forEach((product) => {
      map.set(product.categoryId, product.category.name);
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesQuery =
        !normalizedQuery ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.brand.toLowerCase().includes(normalizedQuery) ||
        product.sku?.toLowerCase().includes(normalizedQuery);

      const matchesCategory =
        !categoryId || product.categoryId === categoryId;

      const matchesStatus =
        !status ||
        (status === "active" && product.active) ||
        (status === "inactive" && !product.active);

      const matchesTag =
        !tag ||
        (tag === "featured" && product.featured) ||
        (tag === "new" && product.isNew) ||
        (tag === "bestSeller" && product.bestSeller);

      return (
        matchesQuery &&
        matchesCategory &&
        matchesStatus &&
        matchesTag
      );
    });
  }, [products, query, categoryId, status, tag]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  const safePage = Math.min(page, totalPages);

  const visibleProducts = filtered.slice(
    (safePage - 1) * perPage,
    safePage * perPage
  );

  function resetPage() {
    setPage(1);
  }

  async function toggleActive(product: Row) {
    setTogglingId(product.id);

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: !product.active,
        }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível atualizar o produto.");
      }

      router.refresh();
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              resetPage();
            }}
            placeholder="Buscar por nome, marca ou SKU..."
            className="flex-1 rounded-xl border border-rosa/20 px-4 py-2.5 text-sm outline-none bg-white"
          />

          <Link
            href="/admin/produtos/novo"
            className="text-xs font-bold px-4 py-2.5 rounded-xl text-white whitespace-nowrap text-center"
            style={{ backgroundColor: "#E4127B" }}
          >
            + Novo produto
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              resetPage();
            }}
            className="rounded-xl border border-rosa/20 px-3 py-2 text-xs bg-white"
          >
            <option value="">Todas as categorias</option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              resetPage();
            }}
            className="rounded-xl border border-rosa/20 px-3 py-2 text-xs bg-white"
          >
            <option value="">Ativos e inativos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>

          <select
            value={tag}
            onChange={(e) => {
              setTag(e.target.value);
              resetPage();
            }}
            className="rounded-xl border border-rosa/20 px-3 py-2 text-xs bg-white"
          >
            <option value="">Todos os tipos</option>
            <option value="featured">Destaques</option>
            <option value="new">Novidades</option>
            <option value="bestSeller">Mais vendidos</option>
          </select>

          <div className="flex gap-2">
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="flex-1 rounded-xl border border-rosa/20 px-3 py-2 text-xs bg-white"
            >
              <option value={10}>10 por página</option>
              <option value={30}>30 por página</option>
              <option value={50}>50 por página</option>
            </select>

            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`w-10 rounded-xl border flex items-center justify-center ${
                viewMode === "list"
                  ? "border-rosa-profundo text-rosa-profundo bg-rosa/5"
                  : "border-rosa/20 text-cinza bg-white"
              }`}
              title="Visualização em lista"
            >
              <List size={16} />
            </button>

            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`w-10 rounded-xl border flex items-center justify-center ${
                viewMode === "grid"
                  ? "border-rosa-profundo text-rosa-profundo bg-rosa/5"
                  : "border-rosa/20 text-cinza bg-white"
              }`}
              title="Visualização em grade"
            >
              <Grid2X2 size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-cinza">
            {filtered.length} produto{filtered.length === 1 ? "" : "s"} encontrado
            {filtered.length === 1 ? "" : "s"}
          </p>

          {(query || categoryId || status || tag) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategoryId("");
                setStatus("");
                setTag("");
                setPage(1);
              }}
              className="text-[11px] font-bold text-rosa-profundo"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
            : "flex flex-col gap-2"
        }
      >
        {visibleProducts.map((product) => {
          const stock = computeStockStatus(product.stockQty);

          return (
            <div
              key={product.id}
              className={
                viewMode === "grid"
                  ? "flex flex-col bg-white rounded-xl p-4"
                  : "flex items-center gap-3 bg-white rounded-xl p-3"
              }
              style={{
                boxShadow: "0 2px 10px rgba(35,20,42,0.06)",
                opacity: product.active ? 1 : 0.55,
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1 mb-1">
                  {product.featured && (
                    <span className="text-[9px] font-bold rounded-full bg-rosa/10 text-rosa-profundo px-2 py-1">
                      Destaque
                    </span>
                  )}

                  {product.isNew && (
                    <span className="text-[9px] font-bold rounded-full bg-creme text-texto px-2 py-1">
                      Novidade
                    </span>
                  )}

                  {product.bestSeller && (
                    <span className="text-[9px] font-bold rounded-full bg-navy/5 text-texto px-2 py-1">
                      Mais vendido
                    </span>
                  )}
                </div>

                <p className="text-sm font-bold text-texto truncate">
                  {product.name}
                </p>

                <p className="text-xs text-cinza">
                  {product.brand} · {product.category.name}
                </p>

                {product.sku && (
                  <p className="text-[10px] text-cinza mt-0.5">
                    SKU: {product.sku}
                  </p>
                )}

                <p className="text-xs text-cinza mt-1">
                  {STOCK_LABEL[stock]} · {product.stockQty} un.
                </p>

                <p className="text-sm font-bold text-rosa-profundo mt-1">
                  {money(product.promoPrice ?? product.price)}
                </p>
              </div>

              <div
                className={
                  viewMode === "grid"
                    ? "flex gap-2 mt-4"
                    : "flex gap-2"
                }
              >
                <button
                  type="button"
                  onClick={() => toggleActive(product)}
                  disabled={togglingId === product.id}
                  className="text-xs font-bold px-3 py-2 rounded-xl border border-rosa/20 text-texto whitespace-nowrap disabled:opacity-50"
                >
                  {togglingId === product.id
                    ? "..."
                    : product.active
                      ? "Desativar"
                      : "Ativar"}
                </button>

                <Link
                  href={`/admin/produtos/${product.id}`}
                  className="text-xs font-bold px-3 py-2 rounded-xl text-white whitespace-nowrap text-center"
                  style={{ backgroundColor: "#131B33" }}
                >
                  Editar
                </Link>
              </div>
            </div>
          );
        })}

        {visibleProducts.length === 0 && (
          <div className="rounded-xl bg-white p-6">
            <p className="text-xs text-cinza">
              Nenhum produto encontrado com esses filtros.
            </p>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5">
          <p className="text-[11px] text-cinza">
            Página {safePage} de {totalPages}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="text-xs font-bold px-3 py-2 rounded-xl border border-rosa/20 disabled:opacity-40"
            >
              Anterior
            </button>

            <span className="text-xs font-bold text-texto px-2">
              {safePage}
            </span>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              className="text-xs font-bold px-3 py-2 rounded-xl border border-rosa/20 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
