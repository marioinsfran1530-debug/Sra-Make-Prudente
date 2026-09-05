"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin/analise/produtos", label: "Desempenho" },
  { href: "/admin/analise/oportunidades", label: "Oportunidades" },
  { href: "/admin/analise/buscas", label: "Buscas" },
  { href: "/admin/analise/qualidade", label: "Qualidade" },
  { href: "/admin/analise/descricoes", label: "Descrições" },
];

export function AnalysisSubnav() {
  const pathname = usePathname();
  const onOverview = pathname === "/admin/analise";

  return (
    <div className="sticky top-0 z-20 -mx-4 mb-5 border-b border-rosa/10 bg-creme/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      {!onOverview && (
        <div className="mb-2">
          <Link
            href="/admin/analise"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-rosa-profundo hover:underline"
          >
            ← Voltar para Análise
          </Link>
        </div>
      )}

      <nav
        aria-label="Áreas da análise"
        className="sm:overflow-x-auto sm:pb-0.5 sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden"
      >
        <div className="grid grid-cols-3 gap-2 sm:flex sm:min-w-max sm:items-center">
          {ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-0 items-center justify-center rounded-full border px-2 py-2 text-center text-[11px] font-bold leading-tight transition sm:px-3.5 sm:text-xs ${
                  active
                    ? "border-rosa-profundo bg-rosa-profundo text-white shadow-sm"
                    : "border-rosa/15 bg-white text-cinza hover:border-rosa/30 hover:text-texto"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
