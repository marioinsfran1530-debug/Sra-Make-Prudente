import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createCrmTagAction } from "../actions";
import { CrmTagManager } from "./CrmTagManager";

export const dynamic = "force-dynamic";

type TagRow = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  customers: number;
};

export default async function CrmTagsPage() {
  const tags = await prisma.$queryRaw<TagRow[]>`
    SELECT t."id", t."name", t."slug", t."color", COUNT(ct."customerId")::int AS "customers"
    FROM "CrmTag" t
    LEFT JOIN "CustomerTag" ct ON ct."tagId" = t."id"
    WHERE t."active" = TRUE
    GROUP BY t."id", t."name", t."slug", t."color"
    ORDER BY t."name" ASC
  `;

  const used = tags.filter((tag) => tag.customers > 0).length;
  const customersTagged = tags.reduce((sum, tag) => sum + tag.customers, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/crm" className="text-[11px] font-bold text-rosa-profundo">← Clientes</Link>
          <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-rosa-profundo">Organização do CRM</p>
          <h1 className="mt-1 font-serif text-2xl font-bold text-texto">Etiquetas</h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-cinza">
            Use etiquetas para interesses e contexto, como Cílios, Noivas, Meta Ads ou Cliente recorrente. A etapa da venda continua sendo controlada no Funil.
          </p>
        </div>
        <Link href="/admin/crm/funil" className="rounded-xl border border-rosa/20 bg-white px-4 py-2.5 text-center text-xs font-bold text-rosa-profundo">
          Ver funil
        </Link>
      </div>

      <section className="grid grid-cols-3 gap-2 sm:gap-3">
        <Metric label="Etiquetas" value={tags.length} />
        <Metric label="Em uso" value={used} />
        <Metric label="Aplicações" value={customersTagged} />
      </section>

      <section className="rounded-2xl border border-rosa/15 bg-white p-4 shadow-sm sm:p-5">
        <div>
          <h2 className="text-sm font-extrabold text-texto">Nova etiqueta</h2>
          <p className="mt-1 text-[11px] text-cinza">Crie somente etiquetas que realmente ajudem a segmentar atendimento, campanha ou recompra.</p>
        </div>
        <form action={createCrmTagAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <label className="text-xs font-bold text-texto">
            Nome
            <input
              name="name"
              required
              maxLength={80}
              placeholder="Ex.: Cílios, Noivas, Cliente recorrente"
              className="mt-1 w-full rounded-xl border border-rosa/20 px-3 py-3 text-base font-normal outline-none focus:border-rosa-profundo sm:text-sm"
            />
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
          <button className="rounded-xl bg-rosa-profundo px-5 py-3 text-xs font-extrabold text-white">Criar etiqueta</button>
        </form>
      </section>

      <CrmTagManager tags={tags} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-rosa/15 bg-white p-3 shadow-sm sm:p-4">
      <p className="text-lg font-extrabold text-texto sm:text-xl">{value.toLocaleString("pt-BR")}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-cinza">{label}</p>
    </div>
  );
}
