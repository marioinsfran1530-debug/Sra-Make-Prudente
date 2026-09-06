import Link from "next/link";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-24 sm:pb-0">
      <nav className="mx-auto mb-4 hidden max-w-6xl gap-2 overflow-x-auto rounded-2xl border border-rosa/15 bg-white p-2 shadow-sm sm:flex" aria-label="CRM">
        <Link href="/admin/crm/oportunidades" className="whitespace-nowrap rounded-xl bg-rosa-profundo px-3 py-2 text-[11px] font-extrabold text-white">Hoje</Link>
        <Link href="/admin/crm/atendimento" className="whitespace-nowrap rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-extrabold text-white">Atender</Link>
        <Link href="/admin/crm" className="whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-bold text-rosa-profundo hover:bg-creme">Clientes</Link>
        <Link href="/admin/crm/funil" className="whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-bold text-rosa-profundo hover:bg-creme">Funil</Link>
        <Link href="/admin/crm/follow-ups" className="whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-bold text-rosa-profundo hover:bg-creme">Follow-ups</Link>
        <Link href="/admin/crm/follow-ups/novo" className="whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-bold text-rosa-profundo hover:bg-creme">Agendar retorno</Link>
        <Link href="/admin/crm/novo" className="whitespace-nowrap rounded-xl border border-rosa-profundo px-3 py-2 text-[11px] font-extrabold text-rosa-profundo">+ Novo contato</Link>
      </nav>

      {children}

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-rosa/15 bg-white/95 px-2 pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden"
        aria-label="Navegação rápida do CRM"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end gap-1">
          <MobileNav href="/admin/crm/oportunidades" label="Hoje" />
          <MobileNav href="/admin/crm" label="Clientes" />
          <Link href="/admin/crm/atendimento" className="-mt-5 flex flex-col items-center justify-end" aria-label="Novo atendimento">
            <span className="flex min-h-12 min-w-[76px] items-center justify-center rounded-2xl bg-emerald-600 px-3 py-3 text-xs font-extrabold text-white shadow-lg">Atender</span>
          </Link>
          <MobileNav href="/admin/crm/funil" label="Funil" />
          <MobileNav href="/admin/crm/follow-ups" label="Tarefas" />
        </div>
      </nav>
    </div>
  );
}

function MobileNav({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex min-h-11 items-center justify-center rounded-xl px-1 text-center text-[10px] font-extrabold text-rosa-profundo active:bg-creme">
      {label}
    </Link>
  );
}
