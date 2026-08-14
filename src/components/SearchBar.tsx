"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function SearchBar({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/busca?q=${encodeURIComponent(value)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 pb-3">
      <div className="flex items-center gap-2 rounded-full px-4 py-2.5 bg-creme">
        <Search size={18} className="text-rosa-profundo" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Buscar produto, marca ou categoria..."
          className="bg-transparent outline-none text-sm flex-1 text-texto"
        />
      </div>
    </form>
  );
}
