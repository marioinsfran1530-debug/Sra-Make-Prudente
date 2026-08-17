"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
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

  const [sub, setSub] = useState<string>(initialSubcategory);
  const [brand, setBrand] = useState<string>("all");

  const subcategoryFromUrl =
    searchParams.get("subcategoria") || "all";

  useEffect(() => {
    setSub(subcategoryFromUrl);
    setBrand("all");
    setMaxPrice(100);
  }, [subcategoryFromUrl, categorySlug]);
  const [maxPrice, setMaxPrice] = useState<number>(100);
  const [showFilters, setShowFilters] = useState(false);

  const products = useMemo(() => {
    return initialProducts.filter((product) => {
      const matchesSubcategory =
        sub === "all" ||
        product.subcategory?.slug === sub;

      const matchesBrand =
        brand === "all" ||
        product.brand === brand;

      const effectivePrice =
        product.promoPrice ?? product.price;

      const matchesPrice =
        maxPrice >= 100 ||
        effectivePrice <= maxPrice;

      return (
        matchesSubcategory &&
        matchesBrand &&
        matchesPrice
      );
    });
  }, [initialProducts, sub, brand, maxPrice]);

  return (
    <div className="pb-6">
      {subcategories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-2">
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

      <div className="px-4 flex items-center justify-between pt-1 pb-2">
        <p className="text-xs text-cinza">
          {products.length} produtos
        </p>

        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-1 text-xs font-bold text-rosa-profundo"
        >
          <SlidersHorizontal size={14} />
          Filtros
        </button>
      </div>

      {showFilters && (
        <div className="mx-4 mb-3 p-3 rounded-2xl flex flex-col gap-3 bg-creme">
          <div>
            <p className="text-[11px] font-bold mb-1.5 text-texto">
              Marca
            </p>

            <div className="flex gap-2 flex-wrap">
              <Chip
                small
                active={brand === "all"}
                onClick={() => setBrand("all")}
              >
                Todas
              </Chip>

              {brands.map((b) => (
                <Chip
                  small
                  key={b}
                  active={brand === b}
                  onClick={() => setBrand(b)}
                >
                  {b}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold mb-1.5 text-texto">
              Até R$ {maxPrice}
            </p>

            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={maxPrice}
              onChange={(e) =>
                setMaxPrice(Number(e.target.value))
              }
              className="w-full accent-pink-600"
            />
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
  small,
}: {
  children: React.ReactNode;
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
