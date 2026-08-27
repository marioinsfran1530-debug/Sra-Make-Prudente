"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export function SearchBar({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(initialValue);
  const [floating, setFloating] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  const catalogSticky =
    pathname === "/categoria" || pathname.startsWith("/categoria/");

  // A busca acompanha a rolagem nas principais páginas de descoberta. No
  // catálogo ela trabalha em conjunto com a navegação de categorias, que fica
  // logo abaixo da barra fixa.
  const keepVisible =
    pathname === "/" ||
    pathname === "/previa" ||
    catalogSticky;

  useEffect(() => {
    if (!keepVisible) {
      setFloating(false);
      return;
    }

    function updateFloatingState() {
      const shell = shellRef.current;
      if (!shell) return;
      setFloating(shell.getBoundingClientRect().top <= 0);
    }

    updateFloatingState();
    window.addEventListener("scroll", updateFloatingState, { passive: true });
    window.addEventListener("resize", updateFloatingState);

    return () => {
      window.removeEventListener("scroll", updateFloatingState);
      window.removeEventListener("resize", updateFloatingState);
    };
  }, [keepVisible]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = value.trim();
    if (!query) return;

    trackEvent("search", { query, context: "search_submit" });
    router.push(`/busca?q=${encodeURIComponent(query)}`);
  }

  return (
    <div
      ref={shellRef}
      className={
        keepVisible ? (catalogSticky ? "min-h-[52px]" : "min-h-[66px]") : undefined
      }
    >
      <form
        onSubmit={handleSubmit}
        className={
          floating
            ? catalogSticky
              ? "fixed inset-x-0 top-0 z-[60] bg-[#FFF7FB] px-4 py-1 shadow-sm"
              : "fixed inset-x-0 top-0 z-[60] bg-[#FFF7FB]/95 px-4 pb-2 pt-2 shadow-md backdrop-blur-md"
            : "px-4 pb-3"
        }
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 rounded-2xl border border-rosa/15 bg-white px-4 py-3 shadow-md transition focus-within:border-rosa/30 focus-within:shadow-lg">
          <Search size={19} className="text-rosa-profundo" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Buscar produto, marca ou categoria..."
            className="flex-1 bg-transparent text-sm text-texto outline-none placeholder:text-cinza/70"
          />
        </div>
      </form>
    </div>
  );
}
