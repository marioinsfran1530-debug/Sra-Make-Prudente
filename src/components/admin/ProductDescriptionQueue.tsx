"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { AdminNotice, UnsavedChangesGuard } from "@/components/admin/AdminUx";

type ProductRow = {
  id: string;
  name: string;
  brand: string;
  categoryId: string;
  subcategoryId: string | null;
  categoryName: string;
  description: string;
  views30d: number;
};

type RowMessage = {
  text: string;
  tone: "error" | "success" | "info";
};

type AiTracking = {
  suggestionId: string | null;
  original: string;
  model: string | null;
  promptVersion: string | null;
};

export function ProductDescriptionQueue({ products }: { products: ProductRow[] }) {
  const [rows, setRows] = useState(products);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "missing" | "short">("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, RowMessage>>({});
  const [aiTracking, setAiTracking] = useState<Record<string, AiTracking>>({});
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    return rows.filter((row) => {
      const description = row.description.trim();
      const matchesStatus =
        status === "all" ||
        (status === "missing" && !description) ||
        (status === "short" && description.length > 0 && description.length < 50);
      const matchesQuery =
        !q ||
        row.name.toLocaleLowerCase("pt-BR").includes(q) ||
        row.brand.toLocaleLowerCase("pt-BR").includes(q) ||
        row.categoryName.toLocaleLowerCase("pt-BR").includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [query, rows, status]);

  function setRowMessage(id: string, text: string, tone: RowMessage["tone"] = "info") {
    setMessages((current) => ({ ...current, [id]: { text, tone } }));
  }

  function clearRowMessage(id: string) {
    setMessages((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function updateDescription(id: string, description: string) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, description } : row))
    );
    setDirtyIds((current) => new Set(current).add(id));
    clearRowMessage(id);
  }

  async function generateWithAi(row: ProductRow) {
    if (generatingId || savingId) return;

    if (!row.name.trim() || !row.brand.trim() || !row.categoryId) {
      setRowMessage(
        row.id,
        "A IA precisa de nome, marca e categoria preenchidos no cadastro.",
        "error"
      );
      return;
    }

    setGeneratingId(row.id);
    setRowMessage(row.id, "Gerando uma sugestão com IA...", "info");

    try {
      const response = await fetch("/api/admin/ai/product-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: row.id,
          name: row.name,
          brand: row.brand,
          categoryId: row.categoryId,
          subcategoryId: row.subcategoryId,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível gerar a descrição agora.");
      }

      const description = typeof payload.description === "string" ? payload.description.trim() : "";
      if (!description) throw new Error("A IA não retornou uma descrição válida.");

      setRows((current) =>
        current.map((item) => (item.id === row.id ? { ...item, description } : item))
      );
      setDirtyIds((current) => new Set(current).add(row.id));
      setAiTracking((current) => ({
        ...current,
        [row.id]: {
          suggestionId: typeof payload.suggestionId === "string" ? payload.suggestionId : null,
          original: description,
          model: typeof payload.model === "string" ? payload.model : null,
          promptVersion: typeof payload.promptVersion === "string" ? payload.promptVersion : null,
        },
      }));
      setRowMessage(row.id, "Sugestão pronta. Revise o texto e salve quando estiver correto.", "success");
    } catch (error) {
      setRowMessage(
        row.id,
        error instanceof Error ? error.message : "Falha ao gerar a descrição.",
        "error"
      );
    } finally {
      setGeneratingId(null);
    }
  }

  async function save(row: ProductRow) {
    const description = row.description.trim();
    if (description.length < 50) {
      setRowMessage(
        row.id,
        "Use pelo menos 50 caracteres para uma descrição realmente útil.",
        "error"
      );
      return;
    }

    setSavingId(row.id);
    setRowMessage(row.id, "Salvando descrição...", "info");

    try {
      const tracking = aiTracking[row.id];
      const response = await fetch(`/api/admin/products/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          ...(tracking?.suggestionId
            ? {
                aiSuggestionId: tracking.suggestionId,
                aiSuggestionEdited: description !== tracking.original.trim(),
              }
            : {}),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível salvar a descrição.");
      }

      setDirtyIds((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
      setRows((current) => current.filter((item) => item.id !== row.id));
      setAiTracking((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
    } catch (error) {
      setRowMessage(
        row.id,
        error instanceof Error ? error.message : "Falha ao salvar.",
        "error"
      );
    } finally {
      setSavingId(null);
    }
  }

  const missingCount = rows.filter((row) => !row.description.trim()).length;
  const shortCount = rows.filter(
    (row) => row.description.trim().length > 0 && row.description.trim().length < 50
  ).length;

  return (
    <div>
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Summary label="Pendentes" value={rows.length} />
        <Summary label="Sem descrição" value={missingCount} />
        <Summary label="Descrição curta" value={shortCount} />
      </div>

      {dirtyIds.size > 0 ? (
        <AdminNotice tone="warning" className="mb-4">
          {dirtyIds.size} descrição{dirtyIds.size === 1 ? "" : "ões"} com alterações ainda não salvas.
        </AdminNotice>
      ) : null}

      <div className="mb-5 rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar produto, marca ou categoria"
            className="w-full rounded-xl border border-rosa/20 px-3 py-2.5 text-sm outline-none focus:border-rosa-profundo"
          />
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "Todos"],
              ["missing", "Sem descrição"],
              ["short", "Curtas"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value as "all" | "missing" | "short")}
                className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                  status === value
                    ? "border-rosa-profundo bg-rosa-profundo text-white"
                    : "border-rosa/15 bg-white text-cinza"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((row) => {
          const length = row.description.trim().length;
          const rowMessage = messages[row.id];
          const tracking = aiTracking[row.id];
          const isGenerating = generatingId === row.id;
          const isSaving = savingId === row.id;

          return (
            <article
              key={row.id}
              className="rounded-2xl border border-rosa/10 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-texto">{row.name}</p>
                  <p className="mt-0.5 text-[11px] text-cinza">
                    {row.brand} · {row.categoryName} · {row.views30d.toLocaleString("pt-BR")} visualizações em 30 dias
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void generateWithAi(row)}
                    disabled={isGenerating || isSaving || Boolean(generatingId && !isGenerating)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rosa-profundo/25 bg-white px-3 py-2 text-xs font-bold text-rosa-profundo disabled:cursor-not-allowed disabled:opacity-40"
                    title="A IA apenas sugere. Revise antes de salvar."
                  >
                    <Sparkles size={14} />
                    {isGenerating ? "Gerando..." : "Gerar com IA"}
                  </button>
                  <Link
                    href={`/admin/produtos/${row.id}`}
                    className="inline-flex items-center rounded-xl border border-rosa/15 px-3 py-2 text-xs font-bold text-cinza hover:text-rosa-profundo"
                  >
                    Cadastro completo
                  </Link>
                </div>
              </div>

              <textarea
                value={row.description}
                onChange={(event) => updateDescription(row.id, event.target.value)}
                rows={4}
                placeholder="Explique o que é o produto, benefício principal, acabamento/uso e características importantes. Evite promessas não comprovadas."
                className="w-full resize-y rounded-xl border border-rosa/20 px-3 py-2.5 text-sm leading-6 outline-none focus:border-rosa-profundo"
              />

              {tracking ? (
                <p className="mt-1 text-[10px] leading-4 text-cinza">
                  Sugestão criada por IA{tracking.model ? ` · ${tracking.model}` : ""}. Você pode editar livremente antes de salvar.
                </p>
              ) : null}

              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p
                    className={`text-[11px] font-semibold ${
                      length >= 50 ? "text-green-700" : "text-amber-700"
                    }`}
                  >
                    {length} caracteres {length >= 50 ? "· tamanho mínimo atendido" : "· mínimo recomendado: 50"}
                  </p>
                  {rowMessage ? (
                    <p
                      className={`mt-1 text-[11px] font-semibold ${
                        rowMessage.tone === "error"
                          ? "text-red-700"
                          : rowMessage.tone === "success"
                            ? "text-green-700"
                            : "text-cinza"
                      }`}
                    >
                      {rowMessage.text}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={isSaving || isGenerating}
                  onClick={() => void save(row)}
                  className="rounded-xl bg-rosa-profundo px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  {isSaving ? "Salvando..." : "Salvar e retirar da fila"}
                </button>
              </div>
            </article>
          );
        })}

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-sm font-semibold text-green-800">
            Nenhum produto pendente neste filtro.
          </div>
        ) : null}
      </div>

      <UnsavedChangesGuard
        when={dirtyIds.size > 0 && !savingId}
        onDiscard={() => setDirtyIds(new Set())}
        message="Há descrições alteradas nesta fila que ainda não foram salvas."
      />
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-2xl font-extrabold text-texto">{value.toLocaleString("pt-BR")}</p>
      <p className="mt-1 text-xs font-bold text-cinza">{label}</p>
    </div>
  );
}
