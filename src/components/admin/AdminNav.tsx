"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; exact?: boolean };

type MenuGroupProps = {
  label: string;
  items: Item[];
  active: boolean;
  isActive: (item: Item) => boolean;
};

const primaryItems: Item[] = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/crm", label: "CRM" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/vendas/nova", label: "Nova venda" },
];

const productItems: Item[] = [
  { href: "/admin/produtos", label: "Produtos", exact: true },
  { href: "/admin/produtos/novo", label: "Novo produto" },
  { href: "/admin/categorias", label: "Categorias e subcategorias" },
];

function NavLink({ item, active }: { item: Item; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-10 items-center justify-center rounded-xl px-3 py-2 text-center text-[11px] font-bold leading-tight transition sm:min-h-0 sm:text-xs ${
        active
          ? "bg-rosa-profundo text-white shadow-sm"
          : "text-cinza hover:bg-rosa/5 hover:text-rosa-profundo"
      }`}
    >
      {item.label}
    </Link>
  );
}

function MenuGroup({ label, items, active, isActive }: MenuGroupProps) {
  return (
    <details className="group relative">
      <summary
        className={`flex min-h-10 cursor-pointer list-none items-center justify-center gap-1 rounded-xl px-3 py-2 text-center text-[11px] font-bold leading-tight transition marker:content-none sm:min-h-0 sm:text-xs ${
          active
            ? "bg-rosa-profundo text-white shadow-sm"
            : "text-cinza hover:bg-rosa/5 hover:text-rosa-profundo"
        }`}
      >
        {label}
        <span aria-hidden="true" className="text-[9px] transition group-open:rotate-180">
          ▼
        </span>
      </summary>

      <div className="absolute right-0 z-40 mt-2 min-w-52 rounded-2xl border border-rosa/15 bg-white p-2 shadow-lg">
        <div className="grid gap-1">
          {items.map((item) => (
            <NavLink key={`${item.href}-${item.label}`} item={item} active={isActive(item)} />
          ))}
        </div>
      </div>
    </details>
  );
}

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const managementItems: Item[] = [
    { href: "/admin/analise", label: "Análise" },
    { href: "/admin/divulgacao", label: "Divulgação" },
    { href: "/admin/loja", label: "Loja" },
    ...(isAdmin
      ? [
          { href: "/admin/ia", label: "IA" },
          { href: "/admin/usuarios", label: "Usuários" },
        ]
      : []),
    { href: "/admin/dispositivos", label: "Segurança" },
  ];

  function isActive(item: Item) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  const productsActive =
    pathname.startsWith("/admin/produtos") || pathname.startsWith("/admin/categorias");
  const managementActive = managementItems.some((item) => isActive(item));

  return (
    <nav
      aria-label="Navegação do painel"
      className="mt-4 rounded-2xl border border-rosa/15 bg-white p-2 shadow-md"
    >
      {/* Mesma hierarquia no celular e no desktop: venda permanece sempre a um toque. */}
      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center">
        {primaryItems.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item)} />
        ))}

        <MenuGroup
          label="Produtos"
          items={productItems}
          active={productsActive}
          isActive={isActive}
        />

        <MenuGroup
          label="Gestão"
          items={managementItems}
          active={managementActive}
          isActive={isActive}
        />
      </div>
    </nav>
  );
}
