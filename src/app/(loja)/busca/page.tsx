"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/EmptyState";
import type { PublicProduct } from "@/lib/data";
import { trackEvent } from "@/lib/analytics";

function BuscaContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setProducts([]);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(() => {
      fetch(`/api/products?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => {
          setProducts(data.products);
          trackEvent("search", { query: q, resultCount: data.products.length });
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <main className="pt-3">
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 rounded-full px-4 py-2.5 bg-creme">
          <Search size={18} className="text-rosa-profundo" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produto, marca ou categoria..."
            className="bg-transparent outline-none text-sm flex-1 text-texto"
          />
        </div>
      </div>

      {!query.trim() ? (
        <div className="px-4 pt-8 text-center">
          <Search size={30} className="text-cinza mx-auto mb-2" />
          <p className="text-sm text-cinza">Digite o nome do produto, marca ou categoria.</p>
        </div>
      ) : (
        <div className="pb-6">
          <p className="px-4 text-xs mb-2 text-cinza">
            {loading ? "Buscando..." : `${products.length} resultados para "${query}"`}
          </p>
          {!loading && products.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default function BuscaPage() {
  return (
    <Suspense fallback={null}>
      <BuscaContent />
    </Suspense>
  );
}
