"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
};

export function AdminNav({
  isAdmin,
}: {
  isAdmin: boolean;
}) {
  const pathname = usePathname();

  const items: Item[] = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/analise", label: "Análise" },
    { href: "/admin/produtos", label: "Produtos" },
    { href: "/admin/categorias", label: "Categorias" },
    { href: "/admin/pedidos", label: "Pedidos" },
    { href: "/admin/divulgacao", label: "Divulgação" },
    { href: "/admin/loja", label: "Loja" },
  ];

  if (isAdmin) {
    items.push(
      { href: "/admin/ia", label: "IA" },
      { href: "/admin/usuarios", label: "Usuários" }
    );
  }

  function isActive(href: string) {
    if (href === "/admin") {
      return pathname === "/admin";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      aria-label="Navegação do painel"
      className="mt-4 rounded-2xl border border-rosa/15 bg-white p-2 shadow-md"
    >
      <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold sm:flex sm:flex-wrap sm:text-xs">
        {items.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-10 items-center justify-center rounded-xl px-2 py-2 text-center leading-tight transition sm:min-h-0 sm:px-3 ${
                active
                  ? "bg-rosa-profundo text-white shadow-sm"
                  : "text-cinza hover:bg-rosa/5 hover:text-rosa-profundo"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
