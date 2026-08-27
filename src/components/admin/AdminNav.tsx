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
      className="mt-4 overflow-x-auto rounded-2xl border border-rosa/15 bg-white px-2 py-2 shadow-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex min-w-max items-center gap-1.5 text-xs font-bold sm:flex-wrap sm:min-w-0">
        {items.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap rounded-xl px-3 py-2 transition ${
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
