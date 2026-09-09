"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string };

type MenuGroupProps = {
  label: string;
  items: Item[];
  active: boolean;
  isActive: (href: string) => boolean;
  className?: string;
};

const primaryItems: Item[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/vendas/nova", label: "Nova venda" },
  { href: "/admin/crm", label: "CRM" },
  { href: "/admin/pedidos", label: "Pedidos" },
];

const catalogItems: Item[] = [
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/categorias", label: "Categorias" },
  { href: "/admin/loja", label: "Loja" },
  { href: "/admin/divulgacao", label: "Divulgação" },
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

function MenuGroup({ label, items, active, isActive, className = "" }: MenuGroupProps) {
  return (
    <details className={`group relative ${className}`}>
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

      <div className="absolute right-0 z-40 mt-2 min-w-44 rounded-2xl border border-rosa/15 bg-white p-2 shadow-lg">
        <div className="grid gap-1">
          {items.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
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
    ...(isAdmin
      ? [
          { href: "/admin/ia", label: "IA" },
          { href: "/admin/usuarios", label: "Usuários" },
        ]
      : []),
    { href: "/admin/dispositivos", label: "Segurança" },
  ];

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const catalogActive = catalogItems.some((item) => isActive(item.href));
  const managementActive = managementItems.some((item) => isActive(item.href));
  const secondaryItems = [...catalogItems, ...managementItems];
  const secondaryActive = secondaryItems.some((item) => isActive(item.href));

  return (
    <nav
      aria-label="Navegação do painel"
      className="mt-4 rounded-2xl border border-rosa/15 bg-white p-2 shadow-md"
    >
      {/* Celular: mantém as quatro ações mais usadas e recolhe o restante. */}
      <div className="grid grid-cols-3 gap-1.5 sm:hidden">
        {primaryItems.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}

        <MenuGroup
          label="Menu"
          items={secondaryItems}
          active={secondaryActive}
          isActive={isActive}
          className="col-span-2"
        />
      </div>

      {/* Desktop: seis opções visíveis, com funções secundárias agrupadas. */}
      <div className="hidden items-center gap-1.5 sm:flex sm:flex-wrap">
        {primaryItems.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}

        <MenuGroup
          label="Catálogo"
          items={catalogItems}
          active={catalogActive}
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
