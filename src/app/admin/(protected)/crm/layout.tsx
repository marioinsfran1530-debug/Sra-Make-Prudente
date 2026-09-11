"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type CrmSection = "hoje" | "clientes" | "atender" | "funil" | "tarefas" | "etiquetas";

function currentSection(pathname: string): CrmSection {
  if (pathname.startsWith("/admin/crm/oportunidades")) return "hoje";
  if (pathname.startsWith("/admin/crm/central") || pathname.startsWith("/admin/crm/atendimento")) return "atender";
  if (pathname.startsWith("/admin/crm/funil")) return "funil";
  if (pathname.startsWith("/admin/crm/follow-ups")) return "tarefas";
  if (pathname.startsWith("/admin/crm/etiquetas")) return "etiquetas";
  return "clientes";
}

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = currentSection(pathname);
  const customerMatch = pathname.match(/^\/admin\/crm\/cliente\/([^/]+)$/);
  const customerId = customerMatch?.[1] ? decodeURIComponent(customerMatch[1]) : null;

  return (
    <div className="pb-24 sm:pb-0">
      <nav className="mx-auto mb-4 hidden max-w-6xl gap-2 overflow-x-auto rounded-2xl border border-rosa/15 bg-white p-2 shadow-sm sm:flex" aria-label="CRM">
        <DesktopNav href="/admin/crm/oportunidades" label="Hoje" active={active === "hoje"} />
        <DesktopNav href="/admin/crm/central" label="Atender" active={active === "atender"} accent="green" />
        <DesktopNav href="/admin/crm" label="Clientes" active={active === "clientes"} />
        <DesktopNav href="/admin/crm/funil" label="Funil" active={active === "funil"} />
        <DesktopNav href="/admin/crm/follow-ups" label="Follow-ups" active={active === "tarefas"} />
        <DesktopNav href="/admin/crm/etiquetas" label="Etiquetas" active={active === "etiquetas"} />
        <Link href="/admin/crm/follow-ups/novo" className="whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-bold text-rosa-profundo hover:bg-creme">Agendar retorno</Link>
        <Link href="/admin/crm/novo" className="whitespace-nowrap rounded-xl border border-rosa-profundo px-3 py-2 text-[11px] font-extrabold text-rosa-profundo">+ Novo contato</Link>
      </nav>

      {customerId && (
        <div className="mx-auto mb-3 flex max-w-6xl justify-end">
          <Link href={`/admin/crm/cliente/${encodeURIComponent(customerId)}/editar`} className="rounded-xl border border-rosa/20 bg-white px-3 py-2 text-[11px] font-extrabold text-rosa-profundo shadow-sm">
            Editar cliente
          </Link>
        </div>
      )}

      {children}

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-rosa/15 bg-white/95 px-2 pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden"
        aria-label="Navegação rápida do CRM"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end gap-1">
          <MobileNav href="/admin/crm/oportunidades" label="Hoje" active={active === "hoje"} />
          <MobileNav href="/admin/crm" label="Clientes" active={active === "clientes" || active === "etiquetas"} />
          <MobileNav href="/admin/crm/central" label="Atender" active={active === "atender"} accent="green" elevated />
          <MobileNav href="/admin/crm/funil" label="Funil" active={active === "funil"} />
          <MobileNav href="/admin/crm/follow-ups" label="Tarefas" active={active === "tarefas"} />
        </div>
      </nav>
    </div>
  );
}

function DesktopNav({ href, label, active, accent = "pink" }: { href: string; label: string; active: boolean; accent?: "pink" | "green" }) {
  const activeClass = accent === "green" ? "bg-emerald-600 text-white" : "bg-rosa-profundo text-white";
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-extrabold transition ${active ? activeClass : "text-rosa-profundo hover:bg-creme"}`}
    >
      {label}
    </Link>
  );
}

function MobileNav({ href, label, active, accent = "pink", elevated = false }: { href: string; label: string; active: boolean; accent?: "pink" | "green"; elevated?: boolean }) {
  const activeClass = accent === "green" ? "bg-emerald-600 text-white shadow-lg" : "bg-rosa-profundo text-white shadow-sm";
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${elevated ? "-mt-5" : ""} flex min-h-12 items-center justify-center rounded-2xl px-2 py-3 text-center text-[10px] font-extrabold transition ${active ? activeClass : "text-rosa-profundo active:bg-creme"}`}
    >
      {label}
    </Link>
  );
}
