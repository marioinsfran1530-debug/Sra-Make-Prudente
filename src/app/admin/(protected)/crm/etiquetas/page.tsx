import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createCrmTagAction } from "../actions";

export const dynamic = "force-dynamic";

type TagRow = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  customers: number;
};

function tone(color: string | null) {
  const map: Record<string, string> = {
    sky: "bg-sky-50 text-sky-700",
    pink: "bg-pink-50 text-pink-700",
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    rose: "bg-rose-50 text-rose-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-800",
    zinc: "bg-zinc-100 text-zinc-700",
  };
  return map[color || ""] || "bg-creme text-rosa-profundo";
}

export default async function CrmTagsPage() {
  const tags = await prisma.$queryRaw<TagRow[]>`
    SELECT t."id", t."name", t."slug", t."color", COUNT(ct."customerId")::int AS "customers"
    FROM "CrmTag" t
    LEFT JOIN "CustomerTag" ct ON ct."tagId" = t."id"
    WHERE t."active" = TRUE
    GROUP BY t."id", t."name", t."slug", t."color"
    ORDER BY t."name" ASC
  `;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link href="/admin/crm" className="text-[11px] font-bold text-rosa-profundo">← Clientes</Link>
        <h1 className="mt-1 font-serif text-2xl font-bold text-texto">Etiquetas do CRM</h1>
        <p className="mt-1 text-xs leading-relaxed text-cinza">Etiquetas classificam interesses e contexto. Elas são independentes da etapa do funil e uma cliente pode ter várias ao mesmo tempo.</p>
      </div>

      <section className="rounded-2xl border border-rosa/15 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-extrabold text-texto">Criar etiqueta</h2>
        <form action={createCrmTagAction} className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <label className="text-xs font-bold text-texto">
            Nome
            <input name="name" required maxLength={80} placeholder="Ex.: Base, Noivas, Cliente recorrente" className="mt-1 w-full rounded-xl border border-rosa/20 px-3 py-3 text-base font-normal outline-none focus:border-rosa-profundo sm:text-sm" />
          </label>
          <label className="text-xs font-bold text-texto">
            Cor
            <select name="color" defaultValue="pink" className="mt-1 w-full rounded-xl border border-rosa/20 bg-white px-3 py-3 text-base font-normal outline-none sm:text-sm">
              <option value="pink">Rosa</option>
              <option value="rose">Rosé</option>
              <option value="sky">Azul claro</option>
              <option value="blue">Azul</option>
              <option value="violet">Violeta</option>
              <option value="emerald">Verde</option>
              <option value="amber">Âmbar</option>
              <option value="zinc">Cinza</option>
            </select>
          </label>
          <button className="rounded-xl bg-rosa-profundo px-5 py-3 text-xs font-extrabold text-white">Criar</button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-rosa/15 bg-white shadow-sm">
        <div className="border-b border-rosa/10 px-4 py-3"><p className="text-xs font-extrabold text-texto">{tags.length} etiquetas ativas</p></div>
        <div className="divide-y divide-rosa/10">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center justify-between gap-3 px-4 py-4">
              <div className="min-w-0">
                <span className={`inline-flex rounded-full px-2.5 py-1.5 text-[10px] font-extrabold ${tone(tag.color)}`}>{tag.name}</span>
                <p className="mt-1 text-[10px] text-cinza">{tag.slug}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-texto">{tag.customers}</p>
                <p className="text-[9px] uppercase text-cinza">clientes</p>
              </div>
            </div>
          ))}
          {tags.length === 0 && <p className="px-4 py-8 text-center text-xs text-cinza">Nenhuma etiqueta cadastrada.</p>}
        </div>
      </section>
    </div>
  );
}
