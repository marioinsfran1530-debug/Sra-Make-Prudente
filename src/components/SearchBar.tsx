"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export function SearchBar({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = value.trim();
    if (!query) return;

    // Registra explicitamente o uso da barra antes da navegação. O evento de
    // resultados é separado por contexto para não inflar os relatórios.
    trackEvent("search", { query, context: "search_submit" });
    router.push(`/busca?q=${encodeURIComponent(query)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 pb-3">
      <div className="flex items-center gap-3 rounded-2xl border border-rosa/15 bg-white px-4 py-3 shadow-md transition focus-within:border-rosa/30 focus-within:shadow-lg">
        <Search size={19} className="text-rosa-profundo" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Buscar produto, marca ou categoria..."
          className="bg-transparent outline-none text-sm flex-1 text-texto placeholder:text-cinza/70"
        />
      </div>
    </form>
  );
}
