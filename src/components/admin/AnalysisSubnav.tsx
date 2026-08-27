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
    <div className="sticky top-0 z-20 -mx-6 mb-5 border-b border-rosa/10 bg-creme/95 px-6 py-3 backdrop-blur">
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

      <nav aria-label="Áreas da análise" className="overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-center gap-2">
          {ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full border px-3.5 py-2 text-xs font-bold transition ${
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
