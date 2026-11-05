"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ChevronDown, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/EmptyState";
import type { PublicProduct } from "@/lib/data";
import { normalizeSearchText } from "@/lib/product-search";
import {
  EMPTY_FILTERS,
  FILTER_PARAM_NAMES,
  PRICE_PRESETS,
  SORT_OPTIONS,
  activeFilterCount,
  applyFilters,
  facetCounts,
  filtersToParams,
  parseFilters,
  presetOf,
  priceLabel,
  sanitizeFilters,
  type FilterState,
  type SortKey,
} from "@/lib/product-filters";

// A partir deste número de marcas aparece a caixa "Buscar marca".
const BRAND_SEARCH_FROM = 8;

function productsLabel(count: number) {
  return `${count.toLocaleString("pt-BR")} ${count === 1 ? "produto" : "produtos"}`;
}

// Mantém os filtros no endereço (voltar do celular e link compartilhado
// preservam a seleção) sem recarregar a página.
function writeFiltersToUrl(state: FilterState) {
  const params = new URLSearchParams(window.location.search);
  FILTER_PARAM_NAMES.forEach((name) => params.delete(name));
  Object.entries(filtersToParams(state)).forEach(([name, value]) => params.set(name, value));

  const query = params.toString();
  window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
}

export function ProductListClient({
  initialProducts,
  subcategories,
  brands,
}: {
  initialProducts: PublicProduct[];
  categorySlug: string;
  subcategories: { name: string; slug: string }[];
  brands: string[];
}) {
  const searchParams = useSearchParams();

  const sortedBrands = useMemo(
    () => [...brands].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" })),
    [brands]
  );
  const subSlugs = useMemo(() => subcategories.map((s) => s.slug), [subcategories]);

  const [filters, setFilters] = useState<FilterState>(() =>
    sanitizeFilters(parseFilters(searchParams), sortedBrands, subSlugs)
  );
  const [showFilters, setShowFilters] = useState(false);
  const [brandQuery, setBrandQuery] = useState("");

  // Navegou pelo menu para outra subcategoria: começa essa listagem do zero.
  const urlSub = searchParams.get("subcategoria") || "all";
  const [lastUrlSub, setLastUrlSub] = useState(urlSub);
  if (urlSub !== lastUrlSub) {
    setLastUrlSub(urlSub);
    if (urlSub !== filters.sub) {
      setFilters(sanitizeFilters({ ...EMPTY_FILTERS, sub: urlSub }, sortedBrands, subSlugs));
      setShowFilters(false);
    }
  }

  const update = (patch: Partial<FilterState>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    writeFiltersToUrl(next);
  };

  const clearFilters = () =>
    update({ brands: [], minPrice: null, maxPrice: null, onlyPromo: false, onlyInStock: false });

  useEffect(() => {
    if (!showFilters) return;

    const previousOverflow = document.body.style.overflow;

    const syncBodyLock = () => {
      document.body.style.overflow = window.innerWidth < 640 ? "hidden" : previousOverflow;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowFilters(false);
    };

    syncBodyLock();
    window.addEventListener("resize", syncBodyLock);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("resize", syncBodyLock);
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [showFilters]);

  const products = useMemo(() => applyFilters(initialProducts, filters), [initialProducts, filters]);
  const counts = useMemo(() => facetCounts(initialProducts, filters), [initialProducts, filters]);

  const filterCount = activeFilterCount(filters);
  const hasUnavailable = useMemo(
    () => initialProducts.some((product) => product.stock === "INDISPONIVEL"),
    [initialProducts]
  );
  const activePreset = presetOf(filters);
  const hasPrice = filters.minPrice !== null || filters.maxPrice !== null;

  const visibleBrands = useMemo(() => {
    const query = normalizeSearchText(brandQuery);
    return query ? sortedBrands.filter((brand) => normalizeSearchText(brand).includes(query)) : sortedBrands;
  }, [sortedBrands, brandQuery]);

  const visiblePresets = PRICE_PRESETS.filter(
    (preset) => (counts.presets.get(preset.key) ?? 0) > 0 || activePreset?.key === preset.key
  );

  const showPromoQuick = counts.promo > 0 || filters.onlyPromo;
  const showStockQuick = hasUnavailable || filters.onlyInStock;

  return (
    <div className="pb-6">
      {subcategories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Chip active={filters.sub === "all"} onClick={() => update({ sub: "all" })}>
            Todos
          </Chip>

          {subcategories.map((s) => (
            <Chip key={s.slug} active={filters.sub === s.slug} onClick={() => update({ sub: s.slug })}>
              {s.name}
            </Chip>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-1">
        <p className="shrink-0 text-xs text-cinza" aria-live="polite">
          {productsLabel(products.length)}
        </p>

        <div className="flex min-w-0 items-center gap-2">
          <div className="relative min-w-0">
            <label htmlFor="product-sort" className="sr-only">
              Ordenar produtos
            </label>
            <select
              id="product-sort"
              value={filters.sort}
              onChange={(event) => update({ sort: event.target.value as SortKey })}
              className="h-9 w-full max-w-[9.5rem] appearance-none rounded-full border border-[#E9D9E4] bg-white pl-3 pr-7 text-xs font-bold text-texto shadow-sm outline-none transition focus:border-rosa-profundo focus:ring-2 focus:ring-rosa-profundo/10"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cinza"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((value) => !value)}
            className="relative flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#E9D9E4] bg-white px-3 text-xs font-bold text-rosa-profundo shadow-sm transition hover:bg-creme"
            aria-expanded={showFilters}
            aria-controls="product-filters"
          >
            <SlidersHorizontal size={15} />
            Filtros
            {filterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rosa-profundo px-1 text-[10px] leading-none text-white">
                {filterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Atalhos e filtros ativos, sempre visíveis fora do painel. */}
      {(showPromoQuick || showStockQuick || filterCount > 0) && !showFilters && (
        <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {showPromoQuick && (
            <Chip small active={filters.onlyPromo} onClick={() => update({ onlyPromo: !filters.onlyPromo })}>
              Em promoção
            </Chip>
          )}
          {showStockQuick && (
            <Chip small active={filters.onlyInStock} onClick={() => update({ onlyInStock: !filters.onlyInStock })}>
              Disponíveis
            </Chip>
          )}

          {filters.brands.map((brand) => (
            <ActiveFilter
              key={brand}
              label={brand}
              onRemove={() => update({ brands: filters.brands.filter((item) => item !== brand) })}
            />
          ))}

          {hasPrice && (
            <ActiveFilter
              label={priceLabel(filters.minPrice, filters.maxPrice)}
              onRemove={() => update({ minPrice: null, maxPrice: null })}
            />
          )}

          {filterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="shrink-0 px-1 text-[11px] font-bold text-cinza underline underline-offset-2"
            >
              Limpar tudo
            </button>
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
            role="dialog"
            aria-label="Filtrar produtos"
            className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[88vh] flex-col rounded-t-3xl bg-white shadow-2xl sm:static sm:z-auto sm:mx-4 sm:mb-4 sm:max-h-none sm:rounded-2xl sm:border sm:border-[#E9D9E4] sm:bg-creme sm:shadow-none"
          >
            <div className="flex items-center justify-between px-5 pb-3 pt-4 sm:pb-2">
              <div>
                <p className="text-base font-bold text-texto sm:text-sm">Filtrar produtos</p>
                <p className="mt-0.5 text-xs text-cinza sm:hidden">Encontre mais rápido o que procura</p>
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

            <div className="flex-1 overflow-y-auto px-5 pb-4 sm:grid sm:flex-none sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:pb-2">
              <Section title="Marca">
                {sortedBrands.length >= BRAND_SEARCH_FROM && (
                  <div className="relative mb-2">
                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cinza" />
                    <input
                      type="search"
                      value={brandQuery}
                      onChange={(event) => setBrandQuery(event.target.value)}
                      placeholder="Buscar marca"
                      aria-label="Buscar marca"
                      className="h-10 w-full rounded-xl border border-[#E9D9E4] bg-white pl-8 pr-3 text-sm text-texto outline-none transition focus:border-rosa-profundo focus:ring-2 focus:ring-rosa-profundo/10"
                    />
                  </div>
                )}

                <div className="sm:max-h-56 sm:overflow-y-auto sm:pr-1">
                  {visibleBrands.length === 0 && <p className="py-2 text-xs text-cinza">Nenhuma marca encontrada.</p>}
                  {visibleBrands.map((brand) => {
                    const checked = filters.brands.includes(brand);
                    const count = counts.brands.get(brand) ?? 0;
                    return (
                      <CheckRow
                        key={brand}
                        label={brand}
                        count={count}
                        checked={checked}
                        disabled={count === 0 && !checked}
                        onChange={() =>
                          update({
                            brands: checked
                              ? filters.brands.filter((item) => item !== brand)
                              : [...filters.brands, brand],
                          })
                        }
                      />
                    );
                  })}
                </div>
              </Section>

              <Section title="Preço">
                {visiblePresets.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {visiblePresets.map((preset) => (
                      <Chip
                        key={preset.key}
                        small
                        active={activePreset?.key === preset.key}
                        onClick={() =>
                          activePreset?.key === preset.key
                            ? update({ minPrice: null, maxPrice: null })
                            : update({ minPrice: preset.min, maxPrice: preset.max })
                        }
                      >
                        {preset.label}
                      </Chip>
                    ))}
                  </div>
                )}

                <PriceInputs
                  min={filters.minPrice}
                  max={filters.maxPrice}
                  lowest={Math.floor(counts.priceMin)}
                  highest={Math.ceil(counts.priceMax)}
                  onCommit={(minPrice, maxPrice) => update({ minPrice, maxPrice })}
                />
              </Section>

              <Section title="Ofertas e estoque">
                <CheckRow
                  label="Em promoção"
                  count={counts.promo}
                  checked={filters.onlyPromo}
                  disabled={counts.promo === 0 && !filters.onlyPromo}
                  onChange={() => update({ onlyPromo: !filters.onlyPromo })}
                />
                <CheckRow
                  label="Somente disponíveis"
                  count={counts.inStock}
                  checked={filters.onlyInStock}
                  disabled={counts.inStock === 0 && !filters.onlyInStock}
                  onChange={() => update({ onlyInStock: !filters.onlyInStock })}
                />
              </Section>
            </div>

            <div className="flex gap-3 border-t border-[#E9D9E4] bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 sm:justify-end sm:rounded-b-2xl sm:bg-transparent sm:pb-4">
              <button
                type="button"
                onClick={clearFilters}
                disabled={filterCount === 0}
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
                Ver {productsLabel(products.length)}
              </button>
            </div>
          </div>
        </>
      )}

      {products.length === 0 ? (
        filterCount > 0 || filters.sub !== "all" ? (
          <div className="flex flex-col items-center px-8 py-12 text-center">
            <p className="mb-1 text-sm font-bold text-texto">Nenhum produto com esses filtros</p>
            <p className="mb-4 text-xs text-cinza">Tire algum filtro para ver mais opções.</p>
            <button
              type="button"
              onClick={() => update({ ...EMPTY_FILTERS, sort: filters.sort })}
              className="rounded-full bg-rosa-profundo px-5 py-2.5 text-sm font-bold text-white"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <EmptyState />
        )
      ) : (
        <div className="grid grid-cols-2 gap-4 px-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-[#F1E6EE] py-4 first:border-t-0 first:pt-1 sm:border-t-0 sm:py-2">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-texto">{title}</h3>
      {children}
    </section>
  );
}

function CheckRow({
  label,
  count,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  count: number;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`relative flex min-h-11 cursor-pointer items-center gap-3 rounded-lg py-1.5 text-sm sm:min-h-9 ${
        disabled ? "cursor-not-allowed opacity-40" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition peer-focus-visible:ring-2 peer-focus-visible:ring-rosa-profundo/30 ${
          checked ? "border-rosa-profundo bg-rosa-profundo text-white" : "border-[#D9C6D3] bg-white"
        }`}
      >
        {checked && <Check size={13} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1 truncate text-texto">{label}</span>
      <span className="shrink-0 text-xs text-cinza">{count.toLocaleString("pt-BR")}</span>
    </label>
  );
}

function PriceInputs({
  min,
  max,
  lowest,
  highest,
  onCommit,
}: {
  min: number | null;
  max: number | null;
  lowest: number;
  highest: number;
  onCommit: (min: number | null, max: number | null) => void;
}) {
  // Campos livres: só viram filtro ao sair do campo ou apertar Enter, para não
  // filtrar a cada dígito. Quando o valor muda por outro caminho (faixa pronta,
  // limpar, valores invertidos), os textos acompanham.
  const show = (value: number | null) => (value === null ? "" : String(value));
  const [minText, setMinText] = useState(show(min));
  const [maxText, setMaxText] = useState(show(max));
  const [seen, setSeen] = useState({ min, max });

  if (seen.min !== min || seen.max !== max) {
    setSeen({ min, max });
    setMinText(show(min));
    setMaxText(show(max));
  }

  const read = (value: string) => {
    const text = value.trim().replace(",", ".");
    if (text === "") return null;
    const number = Number(text);
    return Number.isFinite(number) && number >= 0 ? number : null;
  };

  const commit = () => {
    let nextMin = read(minText);
    let nextMax = read(maxText);
    if (nextMin !== null && nextMax !== null && nextMin > nextMax) [nextMin, nextMax] = [nextMax, nextMin];
    setMinText(show(nextMin));
    setMaxText(show(nextMax));
    if (nextMin !== min || nextMax !== max) onCommit(nextMin, nextMax);
  };

  const field = (
    kind: "min" | "max",
    value: string,
    setValue: (value: string) => void,
    placeholder: number
  ) => (
    <label className="min-w-0 flex-1">
      <span className="sr-only">{kind === "min" ? "Preço mínimo" : "Preço máximo"}</span>
      <div className="flex h-11 items-center gap-1 rounded-xl border border-[#E9D9E4] bg-white px-3 focus-within:border-rosa-profundo focus-within:ring-2 focus-within:ring-rosa-profundo/10 sm:h-10">
        <span className="text-xs text-cinza">R$</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          placeholder={String(placeholder)}
          onChange={(event) => setValue(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
          }}
          className="w-full min-w-0 bg-transparent text-sm text-texto outline-none placeholder:text-[#B9A9B5]"
        />
      </div>
    </label>
  );

  return (
    <div className="flex items-center gap-2">
      {field("min", minText, setMinText, lowest)}
      <span className="text-xs text-cinza">até</span>
      {field("max", maxText, setMaxText, highest)}
    </div>
  );
}

function ActiveFilter({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="flex shrink-0 items-center gap-1 rounded-full bg-[#FCE4F1] px-3 py-1.5 text-[11px] font-bold text-rosa-profundo"
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
      aria-pressed={active}
      className={`flex-shrink-0 whitespace-nowrap rounded-full font-semibold transition ${
        small ? "px-3 py-1.5 text-[11px]" : "px-4 py-1.5 text-xs"
      }`}
      style={
        active
          ? { backgroundColor: "#E4127B", color: "#fff", border: "1px solid #E4127B" }
          : { backgroundColor: "#fff", color: "#23142A", border: "1px solid #E9D9E4" }
      }
    >
      {children}
    </button>
  );
}
