"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Search, Trash2, X } from "lucide-react";
import { deleteCrmTagAction, updateCrmTagAction } from "./tag-actions";

export type CrmTagManagerRow = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  customers: number;
};

const COLORS = [
  ["pink", "Rosa"],
  ["rose", "Rosé"],
  ["sky", "Azul claro"],
  ["blue", "Azul"],
  ["violet", "Violeta"],
  ["emerald", "Verde"],
  ["amber", "Âmbar"],
  ["zinc", "Cinza"],
] as const;

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

export function CrmTagManager({ tags }: { tags: CrmTagManagerRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    if (!q) return tags;
    return tags.filter((tag) => `${tag.name} ${tag.slug}`.toLocaleLowerCase("pt-BR").includes(q));
  }, [query, tags]);

  async function updateTag(formData: FormData) {
    const id = String(formData.get("id") ?? "");
    setBusyId(id);
    setError(null);
    try {
      await updateCrmTagAction(formData);
      setEditingId(null);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a etiqueta.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeTag(tag: CrmTagManagerRow) {
    const warning = tag.customers > 0
      ? `Excluir “${tag.name}”? Ela será removida de ${tag.customers} cliente${tag.customers === 1 ? "" : "s"}. Essa ação não pode ser desfeita.`
      : `Excluir “${tag.name}”? Essa ação não pode ser desfeita.`;
    if (!window.confirm(warning)) return;

    setBusyId(tag.id);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("id", tag.id);
      await deleteCrmTagAction(formData);
      if (editingId === tag.id) setEditingId(null);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível excluir a etiqueta.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-rosa/15 bg-white shadow-sm">
      <div className="border-b border-rosa/10 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-texto">{tags.length} etiquetas ativas</p>
            <p className="mt-1 text-[11px] text-cinza">Edite nome e cor ou exclua etiquetas que não fazem mais sentido.</p>
          </div>
          <label className="relative block w-full sm:max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cinza" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar etiqueta"
              className="w-full rounded-xl border border-rosa/15 bg-creme/30 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-rosa-profundo"
            />
          </label>
        </div>
        {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p> : null}
      </div>

      <div className="divide-y divide-rosa/10">
        {filtered.map((tag) => {
          const editing = editingId === tag.id;
          if (editing) {
            return (
              <form key={tag.id} action={updateTag} className="grid gap-3 p-4 lg:grid-cols-[1fr_180px_auto] lg:items-end">
                <input type="hidden" name="id" value={tag.id} />
                <label className="text-xs font-bold text-texto">
                  Nome
                  <input
                    name="name"
                    required
                    maxLength={80}
                    defaultValue={tag.name}
                    className="mt-1 w-full rounded-xl border border-rosa/20 px-3 py-2.5 text-sm font-normal outline-none focus:border-rosa-profundo"
                  />
                </label>
                <label className="text-xs font-bold text-texto">
                  Cor
                  <select
                    name="color"
                    defaultValue={tag.color || "pink"}
                    className="mt-1 w-full rounded-xl border border-rosa/20 bg-white px-3 py-2.5 text-sm font-normal outline-none"
                  >
                    {COLORS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2 lg:flex">
                  <button
                    type="submit"
                    disabled={busyId === tag.id}
                    className="rounded-xl bg-rosa-profundo px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50"
                  >
                    {busyId === tag.id ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-rosa/15 px-4 py-2.5 text-xs font-bold text-cinza"
                  >
                    <X size={14} /> Cancelar
                  </button>
                </div>
              </form>
            );
          }

          return (
            <div key={tag.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-1.5 text-[10px] font-extrabold ${tone(tag.color)}`}>{tag.name}</span>
                  <span className="text-[10px] text-cinza">{tag.customers} cliente{tag.customers === 1 ? "" : "s"}</span>
                </div>
                <p className="mt-1 text-[10px] text-cinza">{tag.slug}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => { setEditingId(tag.id); setError(null); }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rosa/20 px-3 py-2.5 text-xs font-bold text-rosa-profundo"
                >
                  <Pencil size={14} /> Editar
                </button>
                <button
                  type="button"
                  disabled={busyId === tag.id}
                  onClick={() => void removeTag(tag)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-100 px-3 py-2.5 text-xs font-bold text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-cinza">Nenhuma etiqueta encontrada.</p>
        ) : null}
      </div>
    </section>
  );
}
