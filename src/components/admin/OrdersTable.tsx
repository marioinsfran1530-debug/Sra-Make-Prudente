"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { money } from "@/lib/money";

type OrderRow = {
  id: string;
  number: number;
  customerName: string;
  customerPhone: string;
  total: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type Period = "today" | "7d" | "30d" | "month" | "all";

const STATUS_LABEL: Record<string, string> = {
  NOVO: "Novo",
  EM_CONFIRMACAO: "Em confirmação",
  CONFIRMADO: "Confirmado",
  SEPARANDO: "Separando",
  PRONTO_RETIRADA: "Pronto para retirada",
  SAIU_ENTREGA: "Saiu para entrega",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

const PENDING_STATUSES = new Set([
  "NOVO",
  "EM_CONFIRMACAO",
  "CONFIRMADO",
  "SEPARANDO",
  "PRONTO_RETIRADA",
  "SAIU_ENTREGA",
]);

const PERIODS = new Set<Period>(["today", "7d", "30d", "month", "all"]);

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function saoPauloDateParts() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function periodRange(period: Period) {
  if (period === "all") return null;
  const { year, month, day } = saoPauloDateParts();
  const today = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  if (period === "today") return { start: today, end: tomorrow };
  if (period === "month") {
    return {
      start: new Date(Date.UTC(year, month - 1, 1, 3, 0, 0, 0)),
      end: tomorrow,
    };
  }

  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (period === "7d" ? 6 : 29));
  return { start, end: tomorrow };
}

function statusTone(status: string) {
  if (status === "NOVO") return "bg-rosa/10 text-rosa-profundo";
  if (status === "FINALIZADO") return "bg-green-50 text-green-700";
  if (status === "CANCELADO") return "bg-red-50 text-red-700";
  if (status === "PRONTO_RETIRADA" || status === "SAIU_ENTREGA") {
    return "bg-blue-50 text-blue-700";
  }
  return "bg-amber-50 text-amber-700";
}

export function OrdersTable({
  orders,
  initialStatus = "",
  initialPeriod = "30d",
}: {
  orders: OrderRow[];
  initialStatus?: string;
  initialPeriod?: string;
}) {
  const safeInitialStatus =
    initialStatus === "pending" || Object.prototype.hasOwnProperty.call(STATUS_LABEL, initialStatus)
      ? initialStatus
      : "";
  const safeInitialPeriod = PERIODS.has(initialPeriod as Period)
    ? (initialPeriod as Period)
    : "30d";

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(safeInitialStatus);
  const [period, setPeriod] = useState<Period>(safeInitialPeriod);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const filtered = useMemo(() => {
    const terms = normalize(query).split(" ").filter(Boolean);
    const range = periodRange(period);

    return orders.filter((order) => {
      const searchable = normalize(
        `${order.number} ${order.customerName} ${order.customerPhone}`
      );
      const matchesQuery = terms.every((term) => searchable.includes(term));
      const matchesStatus =
        !status ||
        (status === "pending" ? PENDING_STATUSES.has(order.status) : order.status === status);

      const referenceDate =
        order.status === "FINALIZADO" || order.status === "CANCELADO"
          ? new Date(order.updatedAt)
          : new Date(order.createdAt);
      const matchesPeriod =
        !range || (referenceDate >= range.start && referenceDate < range.end);

      return matchesQuery && matchesStatus && matchesPeriod;
    });
  }, [orders, period, query, status]);

  const counts = useMemo(() => {
    const range = periodRange(period);
    const inPeriod = (order: OrderRow) => {
      if (!range) return true;
      const referenceDate =
        order.status === "FINALIZADO" || order.status === "CANCELADO"
          ? new Date(order.updatedAt)
          : new Date(order.createdAt);
      return referenceDate >= range.start && referenceDate < range.end;
    };
    return {
      new: orders.filter((order) => order.status === "NOVO" && inPeriod(order)).length,
      pending: orders.filter(
        (order) => PENDING_STATUSES.has(order.status) && inPeriod(order)
      ).length,
    };
  }, [orders, period]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  function changeFilter(callback: () => void) {
    callback();
    setPage(1);
  }

  return (
    <div>
      <div className="mb-4 grid gap-3 rounded-2xl bg-white p-3 shadow-sm sm:p-4">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cinza"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => changeFilter(() => setQuery(event.target.value))}
            placeholder="Buscar por pedido, cliente ou telefone..."
            className="w-full rounded-xl border border-rosa/20 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-rosa-profundo"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={status}
            onChange={(event) => changeFilter(() => setStatus(event.target.value))}
            className="rounded-xl border border-rosa/20 bg-white px-3 py-2.5 text-xs"
          >
            <option value="">Todos os status</option>
            <option value="pending">Em andamento ({counts.pending})</option>
            <option value="NOVO">Novos ({counts.new})</option>
            <option value="CONFIRMADO">Confirmados</option>
            <option value="SEPARANDO">Separando</option>
            <option value="PRONTO_RETIRADA">Prontos para retirada</option>
            <option value="SAIU_ENTREGA">Saiu para entrega</option>
            <option value="FINALIZADO">Finalizados</option>
            <option value="CANCELADO">Cancelados</option>
          </select>

          <select
            value={period}
            onChange={(event) =>
              changeFilter(() => setPeriod(event.target.value as Period))
            }
            className="rounded-xl border border-rosa/20 bg-white px-3 py-2.5 text-xs"
          >
            <option value="today">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="month">Este mês</option>
            <option value="all">Todo período carregado</option>
          </select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-cinza">
            {filtered.length} pedido{filtered.length === 1 ? "" : "s"} encontrado
            {filtered.length === 1 ? "" : "s"}
          </p>
          {(query || status || period !== "30d") && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatus("");
                setPeriod("30d");
                setPage(1);
              }}
              className="text-[11px] font-bold text-rosa-profundo"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {visible.map((order) => (
          <Link
            key={order.id}
            href={`/admin/pedidos/${order.id}`}
            className={`rounded-2xl bg-white px-4 py-3 transition hover:-translate-y-0.5 ${
              order.status === "NOVO" ? "border-l-4 border-l-rosa-profundo" : ""
            }`}
            style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-bold text-texto">
                    #{order.number} — {order.customerName}
                  </p>
                  <span
                    className={`rounded-full px-2 py-1 text-[9px] font-bold ${statusTone(order.status)}`}
                  >
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-cinza">
                  {new Date(order.createdAt).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <p className="shrink-0 text-sm font-extrabold text-rosa-profundo">
                {money(order.total)}
              </p>
            </div>
          </Link>
        ))}

        {visible.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-bold text-texto">Nenhum pedido encontrado</p>
            <p className="mt-1 text-xs text-cinza">
              Ajuste a busca, o status ou o período para ampliar os resultados.
            </p>
          </div>
        )}
      </div>

      {filtered.length > 0 && totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-[11px] text-cinza">
            Página {safePage} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-xl border border-rosa/20 px-3 py-2 text-xs font-bold disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="rounded-xl border border-rosa/20 px-3 py-2 text-xs font-bold disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
