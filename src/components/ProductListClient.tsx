"use client";

import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/EmptyState";
import type { PublicProduct } from "@/lib/data";

export function ProductListClient({
  initialProducts,
  categorySlug,
  subcategories,
  brands,
}: {
  initialProducts: PublicProduct[];
  categorySlug: string;
  subcategories: { name: string; slug: string }[];
  brands: string[];
}) {
  const searchParams = useSearchParams();

  const initialSubcategory =
    searchParams.get("subcategoria") || "all";

  const priceCeiling = useMemo(() => {
    const highestPrice = initialProducts.reduce((highest, product) => {
      const effectivePrice = Number(
        product.promoPrice ?? product.price
      );

      return Math.max(highest, effectivePrice);
    }, 0);

    return Math.max(
      100,
      Math.ceil(highestPrice / 10) * 10
    );
  }, [initialProducts]);

  const sortedBrands = useMemo(
    () =>
      [...brands].sort((a, b) =>
        a.localeCompare(b, "pt-BR", {
          sensitivity: "base",
        })
      ),
    [brands]
  );

  const [sub, setSub] = useState<string>(initialSubcategory);
  const [brand, setBrand] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<number>(priceCeiling);
  const [showFilters, setShowFilters] = useState(false);

  const subcategoryFromUrl =
    searchParams.get("subcategoria") || "all";

  useEffect(() => {
    setSub(subcategoryFromUrl);
    setBrand("all");
    setMaxPrice(priceCeiling);
    setShowFilters(false);
  }, [subcategoryFromUrl, categorySlug, priceCeiling]);

  useEffect(() => {
    if (!showFilters) return;

    const previousOverflow = document.body.style.overflow;

    const syncBodyLock = () => {
      if (window.innerWidth < 640) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = previousOverflow;
      }
    };

    syncBodyLock();
    window.addEventListener("resize", syncBodyLock);

    return () => {
      window.removeEventListener("resize", syncBodyLock);
      document.body.style.overflow = previousOverflow;
    };
  }, [showFilters]);

  const products = useMemo(() => {
    return initialProducts.filter((product) => {
      const matchesSubcategory =
        sub === "all" ||
        product.subcategory?.slug === sub;

      const matchesBrand =
        brand === "all" || product.brand === brand;

      const effectivePrice = Number(
        product.promoPrice ?? product.price
      );

      const matchesPrice = effectivePrice <= maxPrice;

      return (
        matchesSubcategory &&
        matchesBrand &&
        matchesPrice
      );
    });
  }, [initialProducts, sub, brand, maxPrice]);

  const activeFilterCount =
    (brand !== "all" ? 1 : 0) +
    (maxPrice < priceCeiling ? 1 : 0);

  const clearFilters = () => {
    setBrand("all");
    setMaxPrice(priceCeiling);
  };

  return (
    <div className="pb-6">
      {subcategories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Chip
            active={sub === "all"}
            onClick={() => setSub("all")}
          >
            Todos
          </Chip>

          {subcategories.map((s) => (
            <Chip
              key={s.slug}
              active={sub === s.slug}
              onClick={() => setSub(s.slug)}
            >
              {s.name}
            </Chip>
          ))}
        </div>
      )}

      <div className="px-4 flex items-center justify-between gap-3 pt-1 pb-3">
        <p className="text-xs text-cinza">
          {products.length} produtos
        </p>

        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="relative flex items-center gap-1.5 rounded-full border border-[#E9D9E4] bg-white px-3 py-2 text-xs font-bold text-rosa-profundo shadow-sm transition hover:bg-rosa-claro/40"
          aria-expanded={showFilters}
          aria-controls="product-filters"
        >
          <SlidersHorizontal size={15} />
          Filtros

          {activeFilterCount > 0 && (
            <span className="flex min-w-5 h-5 items-center justify-center rounded-full bg-rosa-profundo px-1 text-[10px] leading-none text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {activeFilterCount > 0 && !showFilters && (
        <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {brand !== "all" && (
            <ActiveFilter
              label={brand}
              onRemove={() => setBrand("all")}
            />
          )}

          {maxPrice < priceCeiling && (
            <ActiveFilter
              label={`Até R$ ${maxPrice}`}
              onRemove={() => setMaxPrice(priceCeiling)}
            />
          )}
        </div>
      )}

      {showFilters && (
        <>
          <button
            type="button"
            aria-label="Fechar filtros"
            onClick={() => setShowFilters(false)}
            className="fixed inset-0 z-50 bg-black/35 sm:hidden"
          />

          <div
            id="product-filters"
            className="fixed inset-x-0 bottom-0 z-[60] max-h-[82vh] overflow-y-auto rounded-t-3xl bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4 shadow-2xl sm:static sm:z-auto sm:mx-4 sm:mb-4 sm:max-h-none sm:overflow-visible sm:rounded-2xl sm:border sm:border-[#E9D9E4] sm:bg-creme sm:p-4 sm:shadow-none"
          >
            <div className="mb-5 flex items-center justify-between sm:mb-4">
              <div>
                <p className="text-base font-bold text-texto sm:text-sm">
                  Filtrar produtos
                </p>
                <p className="mt-0.5 text-xs text-cinza sm:hidden">
                  Encontre mais rápido o que procura
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-creme text-texto sm:hidden"
                aria-label="Fechar filtros"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
              <div>
                <label
                  htmlFor="brand-filter"
                  className="mb-2 block text-xs font-bold text-texto"
                >
                  Marca
                </label>

                <select
                  id="brand-filter"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#E9D9E4] bg-white px-3 text-sm text-texto outline-none transition focus:border-rosa-profundo focus:ring-2 focus:ring-rosa-profundo/10"
                >
                  <option value="all">Todas as marcas</option>
                  {sortedBrands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="price-filter"
                    className="text-xs font-bold text-texto"
                  >
                    Preço máximo
                  </label>

                  <span className="text-xs font-bold text-rosa-profundo">
                    {maxPrice >= priceCeiling
                      ? "Qualquer preço"
                      : `Até R$ ${maxPrice}`}
                  </span>
                </div>

                <input
                  id="price-filter"
                  type="range"
                  min={10}
                  max={priceCeiling}
                  step={5}
                  value={maxPrice}
                  onChange={(e) =>
                    setMaxPrice(Number(e.target.value))
                  }
                  className="w-full accent-pink-600"
                />

                <div className="mt-1 flex justify-between text-[10px] text-cinza">
                  <span>R$ 10</span>
                  <span>R$ {priceCeiling}+</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3 sm:mt-4 sm:justify-end">
              <button
                type="button"
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#E9D9E4] bg-white px-4 text-sm font-bold text-texto disabled:cursor-not-allowed disabled:opacity-45 sm:h-10 sm:flex-none"
              >
                <RotateCcw size={15} />
                Limpar
              </button>

              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="h-11 flex-[1.35] rounded-xl bg-rosa-profundo px-5 text-sm font-bold text-white sm:h-10 sm:flex-none"
              >
                Ver {products.length} produtos
              </button>
            </div>
          </div>
        </>
      )}

      {products.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveFilter({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="flex flex-shrink-0 items-center gap-1 rounded-full bg-rosa-claro px-3 py-1.5 text-[11px] font-bold text-rosa-profundo"
      title={`Remover filtro ${label}`}
    >
      {label}
      <X size={12} />
    </button>
  );
}

function Chip({
  children,
  active,
  onClick,
  small,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 rounded-full font-semibold whitespace-nowrap transition ${
        small
          ? "px-3 py-1 text-[11px]"
          : "px-4 py-1.5 text-xs"
      }`}
      style={
        active
          ? {
              backgroundColor: "#E4127B",
              color: "#fff",
            }
          : {
              backgroundColor: "#fff",
              color: "#23142A",
              border: "1px solid #E9D9E4",
            }
      }
    >
      {children}
    </button>
  );
}
