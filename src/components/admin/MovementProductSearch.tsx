"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { matchesCounterSaleQuery } from "@/lib/counter-sale-search";

export type MovementSearchProduct = {
  id: string;
  name: string;
  brand: string;
  sku: string | null;
  stockQty: number;
  active: boolean;
  image: string | null;
  // Nomes e códigos das variações, só para a busca achar o produto por eles.
  variantTerms: string[];
};

const MAX_RESULTS = 8;
const BASE_PATH = "/admin/produtos/movimentacao";

// Busca com foto: os produtos aparecem enquanto a pessoa digita, para escolher o certo
// pela imagem (produtos de nome parecido são fáceis de confundir).
export function MovementProductSearch({ products }: { products: MovementSearchProduct[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const trimmed = query.trim();

  const matches = useMemo(() => {
    if (!trimmed) return [];
    return products.filter((product) =>
      matchesCounterSaleQuery([product.name, product.brand, product.sku, ...product.variantTerms], trimmed)
    );
  }, [products, trimmed]);

  const shown = matches.slice(0, MAX_RESULTS);

  function open(id: string) {
    setQuery("");
    router.push(`${BASE_PATH}?id=${encodeURIComponent(id)}`);
  }

  return (
    <div className="mb-4">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (shown[0]) open(shown[0].id);
        }}
        className="relative"
      >
        <Search
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cinza"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pesquisar produto (nome, marca ou código)"
          aria-label="Pesquisar produto"
          autoComplete="off"
          enterKeyHint="search"
          className="input min-h-[48px] w-full !pl-10 !pr-10 !text-base"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpar pesquisa"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-cinza"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </form>

      {trimmed && (
        <div className="mt-2">
          {shown.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-center text-sm text-cinza shadow-sm">
              Nenhum produto encontrado para “{trimmed}”.
            </p>
          ) : (
            <>
              <p className="mb-1.5 text-[11px] text-cinza" aria-live="polite">
                {matches.length > MAX_RESULTS
                  ? `Mostrando ${MAX_RESULTS} de ${matches.length}. Digite mais letras para refinar.`
                  : `${matches.length} produto(s). Toque no certo para ver o histórico.`}
              </p>
              <ul className="grid gap-2">
                {shown.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`${BASE_PATH}?id=${encodeURIComponent(product.id)}`}
                      onClick={() => setQuery("")}
                      className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm transition hover:shadow-md"
                    >
                      {product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image}
                          alt=""
                          loading="lazy"
                          className="h-16 w-16 shrink-0 rounded-xl border border-rosa/10 object-cover"
                        />
                      ) : (
                        <span
                          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-rosa/10 text-[10px] text-cinza"
                          aria-hidden="true"
                        >
                          sem foto
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm font-bold leading-snug text-texto">{product.name}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-cinza">
                          {product.brand}
                          {product.sku ? ` · ${product.sku}` : ""}
                          {product.active ? "" : " · inativo"}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-[10px] uppercase tracking-wide text-cinza">
                        estoque
                        <span className="block text-base font-extrabold text-texto">{product.stockQty}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
