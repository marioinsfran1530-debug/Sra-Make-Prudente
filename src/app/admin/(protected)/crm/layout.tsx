import Link from "next/link";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav className="mx-auto mb-4 flex max-w-6xl gap-2 overflow-x-auto rounded-2xl border border-rosa/15 bg-white p-2 shadow-sm" aria-label="CRM">
        <Link href="/admin/crm" className="whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-bold text-rosa-profundo hover:bg-creme">Clientes</Link>
        <Link href="/admin/crm/funil" className="whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-bold text-rosa-profundo hover:bg-creme">Funil</Link>
        <Link href="/admin/crm/follow-ups" className="whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-bold text-rosa-profundo hover:bg-creme">Follow-ups</Link>
        <Link href="/admin/crm/follow-ups/novo" className="whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-bold text-rosa-profundo hover:bg-creme">Agendar retorno</Link>
        <Link href="/admin/crm/novo" className="whitespace-nowrap rounded-xl bg-rosa-profundo px-3 py-2 text-[11px] font-extrabold text-white">+ Novo contato</Link>
      </nav>
      {children}
    </div>
  );
}
