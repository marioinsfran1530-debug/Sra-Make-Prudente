"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/EmptyState";
import type { PublicProduct } from "@/lib/data";
import { trackEvent } from "@/lib/analytics";

// Tempo parado digitando antes de a busca ser registrada nas estatísticas.
const SEARCH_TRACK_DELAY_MS = 1000;

function BuscaContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [brandBrowse, setBrandBrowse] = useState(searchParams.get("source") === "brand_rail");
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [approximate, setApproximate] = useState(false);
  const [loading, setLoading] = useState(false);
  // Última busca cujo resultado já chegou (a que vale a pena registrar).
  const [settled, setSettled] = useState<{ q: string; count: number } | null>(null);
  const queryRef = useRef(query.trim());
  const pendingRef = useRef<{ q: string; count: number } | null>(null);
  const trackedRef = useRef<string | null>(null);

  const flushSearchEvent = useCallback(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending || trackedRef.current === pending.q) return;

    trackedRef.current = pending.q;
    trackEvent("search", {
      query: pending.q,
      resultCount: pending.count,
      itemCount: pending.count,
      context: "search_results",
    });
  }, []);

  useEffect(() => {
    const q = query.trim();
    queryRef.current = q;
    if (!q) {
      pendingRef.current = null;
      setProducts([]);
      setApproximate(false);
      setSettled(null);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const timeout = setTimeout(() => {
      fetch(`/api/products?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          setProducts(data.products);
          setApproximate(Boolean(data.approximate));
          if (!brandBrowse) setSettled({ q, count: data.products.length });
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, brandBrowse]);

  // Registra a busca só quando a pessoa para de digitar. Antes, cada pausa
  // curta virava um evento ("Higienizqd", "Higienizqdor"...), o que enchia o
  // banco, o GA4 e o Meta com buscas incompletas.
  useEffect(() => {
    if (!settled) return;
    pendingRef.current = settled;
    const timer = setTimeout(() => {
      if (queryRef.current === settled.q) flushSearchEvent();
    }, SEARCH_TRACK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [settled, flushSearchEvent]);

  // Se a pessoa abrir um produto ou sair antes do tempo, a busca não se perde.
  useEffect(() => {
    window.addEventListener("pagehide", flushSearchEvent);
    return () => {
      window.removeEventListener("pagehide", flushSearchEvent);
      flushSearchEvent();
    };
  }, [flushSearchEvent]);

  return (
    <main className="pt-3">
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 rounded-full px-4 py-2.5 bg-creme">
          <Search size={18} className="text-rosa-profundo" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setBrandBrowse(false);
              setQuery(e.target.value);
            }}
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
            {loading
              ? "Buscando..."
              : brandBrowse
                ? `${products.length} produtos da marca “${query}”`
                : approximate
                  ? `Não achamos “${query}” exatamente. ${products.length} resultado${products.length === 1 ? "" : "s"} parecido${products.length === 1 ? "" : "s"}:`
                  : `${products.length} resultados para “${query}”`}
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
