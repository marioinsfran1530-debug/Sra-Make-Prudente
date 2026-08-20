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
    { href: "/admin/produtos", label: "Produtos" },
    { href: "/admin/categorias", label: "Categorias" },
    { href: "/admin/pedidos", label: "Pedidos" },
    { href: "/admin/divulgacao", label: "Divulgação" },
    { href: "/admin/loja", label: "Loja" },
  ];

  if (isAdmin) {
    items.push({
      href: "/admin/usuarios",
      label: "Usuários",
    });
  }

  function isActive(href: string) {
    if (href === "/admin") {
      return pathname === "/admin";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav className="flex flex-wrap gap-2 mt-4 rounded-2xl border border-rosa/15 bg-white px-3 py-2 shadow-md text-xs font-bold">
      {items.map((item) => {
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl px-3 py-2 transition ${
              active
                ? "bg-rosa-profundo text-white shadow-sm"
                : "text-cinza hover:bg-rosa/5 hover:text-rosa-profundo"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
