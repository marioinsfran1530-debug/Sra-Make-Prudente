"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Grid2X2, ImageIcon, List } from "lucide-react";
import { money } from "@/lib/money";
import { computeStockStatus, STOCK_LABEL } from "@/lib/stock";

type Row = {
  id: string;
  name: string;
  brand: string;
  sku: string | null;
  imageUrl: string | null;
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
type VitrineField = "featured" | "isNew" | "bestSeller";

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openVitrineId, setOpenVitrineId] = useState<string | null>(null);
  const [togglingVitrine, setTogglingVitrine] = useState<string | null>(null);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((product) => map.set(product.categoryId, product.category.name));

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const filtered = useMemo(() => {
    const searchTerms = normalizeSearchText(query).split(" ").filter(Boolean);

    return products.filter((product) => {
      const searchableText = normalizeSearchText(
        [product.name, product.brand, product.sku, product.category.name]
          .filter(Boolean)
          .join(" ")
      );
      const matchesQuery = searchTerms.every((term) => searchableText.includes(term));

      const matchesCategory = !categoryId || product.categoryId === categoryId;
      const stockStatus = computeStockStatus(product.stockQty);
      const matchesStatus =
        !status ||
        (status === "active" && product.active) ||
        (status === "inactive" && !product.active) ||
        status === stockStatus;
      const matchesTag =
        !tag ||
        (tag === "featured" && product.featured) ||
        (tag === "new" && product.isNew) ||
        (tag === "bestSeller" && product.bestSeller);

      return matchesQuery && matchesCategory && matchesStatus && matchesTag;
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
        body: JSON.stringify({ active: !product.active }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível atualizar o produto.");
      }

      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Não foi possível atualizar o produto."
      );
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteProduct(product: Row) {
    const confirmed = window.confirm(
      `Excluir “${product.name}” definitivamente?\n\nUse esta opção somente para cadastros feitos por engano. Esta ação não pode ser desfeita.`
    );

    if (!confirmed) return;

    setDeletingId(product.id);

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível excluir o produto.");
      }

      setOpenVitrineId(null);
      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Não foi possível excluir o produto."
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleVitrine(product: Row, field: VitrineField) {
    const operationId = `${product.id}-${field}`;
    setTogglingVitrine(operationId);

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !product[field] }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível atualizar a vitrine.");
      }

      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Não foi possível atualizar a vitrine."
      );
    } finally {
      setTogglingVitrine(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetPage();
            }}
            placeholder="Buscar por nome, marca, categoria ou SKU..."
            className="flex-1 rounded-xl border border-rosa/20 bg-white px-4 py-2.5 text-sm outline-none"
          />

          <Link
            href="/admin/produtos/novo"
            className="whitespace-nowrap rounded-xl px-4 py-2.5 text-center text-xs font-bold text-white"
            style={{ backgroundColor: "#E4127B" }}
          >
            + Novo produto
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              resetPage();
            }}
            className="rounded-xl border border-rosa/20 bg-white px-3 py-2 text-xs"
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
            onChange={(event) => {
              setStatus(event.target.value);
              resetPage();
            }}
            className="rounded-xl border border-rosa/20 bg-white px-3 py-2 text-xs"
          >
            <option value="">Todas as situações</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="DISPONIVEL">Disponível</option>
            <option value="ULTIMAS">Últimas unidades</option>
            <option value="INDISPONIVEL">Sem estoque</option>
          </select>

          <select
            value={tag}
            onChange={(event) => {
              setTag(event.target.value);
              resetPage();
            }}
            className="rounded-xl border border-rosa/20 bg-white px-3 py-2 text-xs"
          >
            <option value="">Todos os tipos</option>
            <option value="featured">Destaques</option>
            <option value="new">Novidades</option>
            <option value="bestSeller">Mais procurados</option>
          </select>

          <div className="flex gap-2">
            <select
              value={perPage}
              onChange={(event) => {
                setPerPage(Number(event.target.value));
                setPage(1);
              }}
              className="flex-1 rounded-xl border border-rosa/20 bg-white px-3 py-2 text-xs"
            >
              <option value={10}>10 por página</option>
              <option value={30}>30 por página</option>
              <option value={50}>50 por página</option>
            </select>

            <ViewButton
              active={viewMode === "list"}
              title="Visualização em lista"
              onClick={() => setViewMode("list")}
            >
              <List size={16} />
            </ViewButton>
            <ViewButton
              active={viewMode === "grid"}
              title="Visualização em grade"
              onClick={() => setViewMode("grid")}
            >
              <Grid2X2 size={16} />
            </ViewButton>
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
            ? "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
            : "flex flex-col gap-2"
        }
      >
        {visibleProducts.map((product) => {
          const stock = computeStockStatus(product.stockQty);
          const deleting = deletingId === product.id;

          return (
            <div
              key={product.id}
              className={
                viewMode === "grid"
                  ? "flex flex-col rounded-xl bg-white p-4"
                  : "flex items-center gap-3 rounded-xl bg-white p-3"
              }
              style={{
                boxShadow: "0 2px 10px rgba(35,20,42,0.06)",
                opacity: product.active ? 1 : 0.55,
              }}
            >
              <div
                className={
                  viewMode === "grid"
                    ? "flex min-w-0 items-start gap-3"
                    : "flex min-w-0 flex-1 items-center gap-3"
                }
              >
                <ProductThumbnail
                  name={product.name}
                  imageUrl={product.imageUrl}
                  compact={viewMode === "list"}
                />

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap gap-1">
                    {product.featured && <Tag>Destaque</Tag>}
                    {product.isNew && <Tag variant="cream">Novidade</Tag>}
                    {product.bestSeller && <Tag variant="navy">Mais procurado</Tag>}
                  </div>

                  <p className="truncate text-sm font-bold text-texto">{product.name}</p>
                  <p className="text-xs text-cinza">
                    {product.brand} · {product.category.name}
                  </p>
                  {product.sku && (
                    <p className="mt-0.5 text-[10px] text-cinza">SKU: {product.sku}</p>
                  )}
                  <p className="mt-1 text-xs text-cinza">
                    {STOCK_LABEL[stock]} · {product.stockQty} un.
                  </p>
                  <p className="mt-1 text-sm font-bold text-rosa-profundo">
                    {money(product.promoPrice ?? product.price)}
                  </p>
                </div>
              </div>

              <div
                className={
                  viewMode === "grid"
                    ? "mt-4 flex flex-wrap gap-2"
                    : "flex flex-wrap justify-end gap-2"
                }
              >
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenVitrineId(openVitrineId === product.id ? null : product.id)
                    }
                    className={`whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-bold ${
                      product.featured || product.isNew || product.bestSeller
                        ? "border-rosa-profundo bg-rosa/10 text-rosa-profundo"
                        : "border-rosa/20 bg-white text-texto"
                    }`}
                  >
                    Vitrine ▾
                  </button>

                  {openVitrineId === product.id && (
                    <div className="absolute bottom-full right-0 z-30 mb-2 w-52 rounded-2xl border border-rosa/10 bg-white p-2 shadow-xl">
                      <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-cinza">
                        Exibir produto em
                      </p>
                      <VitrineOption
                        label="Destaque"
                        checked={product.featured}
                        loading={togglingVitrine === `${product.id}-featured`}
                        onClick={() => toggleVitrine(product, "featured")}
                      />
                      <VitrineOption
                        label="Novidade"
                        checked={product.isNew}
                        loading={togglingVitrine === `${product.id}-isNew`}
                        onClick={() => toggleVitrine(product, "isNew")}
                      />
                      <VitrineOption
                        label="Mais procurado"
                        checked={product.bestSeller}
                        loading={togglingVitrine === `${product.id}-bestSeller`}
                        onClick={() => toggleVitrine(product, "bestSeller")}
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => toggleActive(product)}
                  disabled={togglingId === product.id || deleting}
                  className="whitespace-nowrap rounded-xl border border-rosa/20 px-3 py-2 text-xs font-bold text-texto disabled:opacity-50"
                >
                  {togglingId === product.id
                    ? "..."
                    : product.active
                      ? "Desativar"
                      : "Ativar"}
                </button>

                <button
                  type="button"
                  onClick={() => deleteProduct(product)}
                  disabled={deleting || togglingId === product.id}
                  className="whitespace-nowrap rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-50"
                >
                  {deleting ? "Excluindo..." : "Excluir"}
                </button>

                <Link
                  href={`/admin/produtos/${product.id}`}
                  className="whitespace-nowrap rounded-xl px-3 py-2 text-center text-xs font-bold text-white"
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
        <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-[11px] text-cinza">
            Página {safePage} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-xl border border-rosa/20 px-3 py-2 text-xs font-bold disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="px-2 text-xs font-bold text-texto">{safePage}</span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="rounded-xl border border-rosa/20 px-3 py-2 text-xs font-bold disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductThumbnail({
  name,
  imageUrl,
  compact,
}: {
  name: string;
  imageUrl: string | null;
  compact: boolean;
}) {
  const size = compact ? "h-11 w-11" : "h-14 w-14";

  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-rosa/10 bg-creme`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <ImageIcon size={compact ? 16 : 18} className="text-cinza/60" aria-hidden="true" />
      )}
    </div>
  );
}

function ViewButton({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-10 items-center justify-center rounded-xl border ${
        active
          ? "border-rosa-profundo bg-rosa/5 text-rosa-profundo"
          : "border-rosa/20 bg-white text-cinza"
      }`}
      title={title}
    >
      {children}
    </button>
  );
}

function Tag({
  children,
  variant = "pink",
}: {
  children: React.ReactNode;
  variant?: "pink" | "cream" | "navy";
}) {
  const classes = {
    pink: "bg-rosa/10 text-rosa-profundo",
    cream: "bg-creme text-texto",
    navy: "bg-navy/5 text-texto",
  }[variant];

  return (
    <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${classes}`}>
      {children}
    </span>
  );
}

function VitrineOption({
  label,
  checked,
  loading,
  onClick,
}: {
  label: string;
  checked: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-rosa/5 disabled:opacity-50"
    >
      <span className="text-xs font-semibold text-texto">{label}</span>
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-md border text-[11px] font-bold ${
          checked
            ? "border-rosa-profundo bg-rosa-profundo text-white"
            : "border-rosa/30 bg-white text-transparent"
        }`}
      >
        {loading ? "…" : "✓"}
      </span>
    </button>
  );
}