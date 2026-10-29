"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; exact?: boolean };

type MenuGroupProps = {
  label: string;
  items: Item[];
  active: boolean;
  open: boolean;
  onToggle: () => void;
  onNavigate: () => void;
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
  { href: "/admin/produtos/custos", label: "Custos e margem" },
  { href: "/admin/produtos/compras", label: "Compras (o que repor)" },
  { href: "/admin/produtos/parado", label: "Estoque parado" },
  { href: "/admin/categorias", label: "Categorias e subcategorias" },
];

function NavLink({ item, active, onNavigate }: { item: Item; active: boolean; onNavigate: () => void }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
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

function MenuGroup({ label, items, active, open, onToggle, onNavigate, isActive }: MenuGroupProps) {
  const panelId = useId();

  // No celular o wrapper some (contents): o botão fica na sua célula da grade e o painel
  // aberto vai para uma linha própria depois dos botões (order-last), então nenhum botão
  // muda de lugar ao abrir. No computador o wrapper ancora o painel flutuante.
  return (
    <div className="contents sm:relative sm:block">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={onToggle}
        className={`flex min-h-10 w-full cursor-pointer items-center justify-center gap-1 rounded-xl px-3 py-2 text-center text-[11px] font-bold leading-tight transition sm:min-h-0 sm:text-xs ${
          active
            ? "bg-rosa-profundo text-white shadow-sm"
            : open
              ? "bg-rosa/10 text-rosa-profundo"
              : "text-cinza hover:bg-rosa/5 hover:text-rosa-profundo"
        }`}
      >
        {label}
        <span aria-hidden="true" className={`text-[9px] transition ${open ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          className="order-last col-span-2 w-full rounded-2xl border border-rosa/15 bg-white p-2 shadow-lg sm:absolute sm:right-0 sm:z-40 sm:mt-2 sm:min-w-52"
        >
          <div className="grid gap-1">
            {items.map((item) => (
              <NavLink
                key={`${item.href}-${item.label}`}
                item={item}
                active={isActive(item)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  // Só um menu fica aberto por vez; null = todos recolhidos.
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const managementItems: Item[] = [
    { href: "/admin/analise", label: "Análise" },
    { href: "/admin/financeiro", label: "Fechamento do mês" },
    { href: "/admin/divulgacao", label: "Divulgação" },
    { href: "/admin/loja", label: "Loja" },
    ...(isAdmin
      ? [
          { href: "/admin/ia", label: "IA" },
          { href: "/admin/usuarios", label: "Usuários" },
        ]
      : []),
  ];

  function isActive(item: Item) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  function close() {
    setOpenGroup(null);
  }

  function toggle(label: string) {
    setOpenGroup((current) => (current === label ? null : label));
  }

  // Mudou de página (menu, botão voltar do navegador ou um redirecionamento): recolhe.
  useEffect(() => {
    setOpenGroup(null);
  }, [pathname]);

  // Com um menu aberto, clicar fora do painel ou apertar Esc recolhe.
  // Usa "click" (e não "pointerdown") para o conteúdo não se mover antes do toque terminar.
  useEffect(() => {
    if (openGroup === null) return;

    function onClick(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpenGroup(null);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      navRef.current?.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')?.focus();
      setOpenGroup(null);
    }

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openGroup]);

  const productsActive =
    pathname.startsWith("/admin/produtos") || pathname.startsWith("/admin/categorias");
  const managementActive = managementItems.some((item) => isActive(item));

  return (
    <nav
      ref={navRef}
      aria-label="Navegação do painel"
      className="mt-4 rounded-2xl border border-rosa/15 bg-white p-2 shadow-md"
    >
      {/* No celular, o grupo aberto expande dentro do fluxo e empurra o conteúdo para baixo. */}
      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center">
        {primaryItems.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item)} onNavigate={close} />
        ))}

        <MenuGroup
          label="Produtos"
          items={productItems}
          active={productsActive}
          open={openGroup === "Produtos"}
          onToggle={() => toggle("Produtos")}
          onNavigate={close}
          isActive={isActive}
        />

        <MenuGroup
          label="Gestão"
          items={managementItems}
          active={managementActive}
          open={openGroup === "Gestão"}
          onToggle={() => toggle("Gestão")}
          onNavigate={close}
          isActive={isActive}
        />
      </div>
    </nav>
  );
}
