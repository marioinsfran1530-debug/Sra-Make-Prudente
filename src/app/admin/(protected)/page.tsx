import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Package,
  ShoppingBag,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";
import { computeStockStatus } from "@/lib/stock";
import { money } from "@/lib/money";

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

const PENDING_STATUSES = [
  "NOVO",
  "EM_CONFIRMACAO",
  "CONFIRMADO",
  "SEPARANDO",
  "PRONTO_RETIRADA",
  "SAIU_ENTREGA",
] as const;

type Period = "today" | "7d" | "30d" | "month" | "all";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "month", label: "Este mês" },
  { value: "all", label: "Todo período" },
];

function getSaoPauloDateParts() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function saoPauloMidnightUtc(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
}

function getPeriodRange(period: Period) {
  if (period === "all") return null;
  const { year, month, day } = getSaoPauloDateParts();
  const todayStart = saoPauloMidnightUtc(year, month, day);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

  if (period === "today") return { gte: todayStart, lt: tomorrowStart };
  if (period === "7d" || period === "30d") {
    const start = new Date(todayStart);
    start.setUTCDate(start.getUTCDate() - (period === "7d" ? 6 : 29));
    return { gte: start, lt: tomorrowStart };
  }
  return { gte: saoPauloMidnightUtc(year, month, 1), lt: tomorrowStart };
}

function ordersHref(status: string, period: Period) {
  return `/admin/pedidos?status=${encodeURIComponent(status)}&period=${period}`;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) return null;

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedPeriod = resolvedSearchParams?.period;
  const period: Period = PERIODS.some((item) => item.value === requestedPeriod)
    ? (requestedPeriod as Period)
    : "today";

  const range = getPeriodRange(period);
  const finalizedDateFilter = range ? { updatedAt: range } : {};
  const canceledDateFilter = range ? { updatedAt: range } : {};
  const pendingDateFilter = range ? { createdAt: range } : {};

  const [activeProducts, allProducts, recentOrders, finalizedOrders, pendingOrders, canceledOrders] =
    await Promise.all([
      prisma.product.count({ where: { active: true } }),
      prisma.product.findMany({ where: { active: true }, select: { stockQty: true } }),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
      prisma.order.aggregate({
        where: { status: "FINALIZADO", ...finalizedDateFilter },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.order.aggregate({
        where: { status: { in: [...PENDING_STATUSES] }, ...pendingDateFilter },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.order.aggregate({
        where: { status: "CANCELADO", ...canceledDateFilter },
        _sum: { total: true },
        _count: { id: true },
      }),
    ]);

  const soldValue = Number(finalizedOrders._sum.total ?? 0);
  const pendingValue = Number(pendingOrders._sum.total ?? 0);
  const canceledValue = Number(canceledOrders._sum.total ?? 0);
  const finalizedCount = finalizedOrders._count.id;
  const pendingCount = pendingOrders._count.id;
  const canceledCount = canceledOrders._count.id;
  const averageTicket = finalizedCount > 0 ? soldValue / finalizedCount : 0;
  const lowStock = allProducts.filter(
    (product) => computeStockStatus(product.stockQty) === "ULTIMAS"
  ).length;
  const outOfStock = allProducts.filter(
    (product) => computeStockStatus(product.stockQty) === "INDISPONIVEL"
  ).length;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-rosa-profundo">
            Visão geral
          </p>
          <h1 className="font-serif text-2xl font-bold text-texto">Dashboard</h1>
          <p className="mt-1 text-sm text-cinza">
            Acompanhe vendas, pedidos e estoque da loja.
          </p>
        </div>
        <Link
          href="/admin/pedidos"
          className="rounded-xl px-4 py-2.5 text-center text-xs font-bold text-white"
          style={{ backgroundColor: "#E4127B" }}
        >
          Ver pedidos
        </Link>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-[11px] font-bold text-texto">Período das vendas</p>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((item) => {
            const active = period === item.value;
            return (
              <Link
                key={item.value}
                href={item.value === "today" ? "/admin" : `/admin?period=${item.value}`}
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  active
                    ? "border-rosa-profundo text-white"
                    : "border-rosa/20 bg-white text-texto hover:bg-rosa/5"
                }`}
                style={active ? { backgroundColor: "#E4127B" } : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <FinancialCard
          href={ordersHref("FINALIZADO", period)}
          title="Vendido"
          value={money(soldValue)}
          subtitle={`${finalizedCount} ${finalizedCount === 1 ? "venda finalizada" : "vendas finalizadas"}`}
          icon={<CheckCircle2 size={20} />}
          tone="green"
        />
        <FinancialCard
          href={ordersHref("pending", period)}
          title="Pendente"
          value={money(pendingValue)}
          subtitle={`${pendingCount} ${pendingCount === 1 ? "pedido em andamento" : "pedidos em andamento"}`}
          icon={<Clock3 size={20} />}
          tone="gold"
        />
        <FinancialCard
          href={ordersHref("CANCELADO", period)}
          title="Cancelado"
          value={money(canceledValue)}
          subtitle={`${canceledCount} ${canceledCount === 1 ? "pedido cancelado" : "pedidos cancelados"}`}
          icon={<XCircle size={20} />}
          tone="red"
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SmallCard
          href={ordersHref("FINALIZADO", period)}
          label="Ticket médio"
          value={money(averageTicket)}
          icon={<TrendingUp size={18} />}
        />
        <SmallCard
          href="/admin/produtos?status=active"
          label="Produtos ativos"
          value={activeProducts}
          icon={<Package size={18} />}
        />
        <SmallCard
          href="/admin/produtos?status=ULTIMAS"
          label="Últimas unidades"
          value={lowStock}
          icon={<AlertTriangle size={18} />}
          alert={lowStock > 0}
        />
        <SmallCard
          href="/admin/produtos?status=INDISPONIVEL"
          label="Sem estoque"
          value={outOfStock}
          icon={<ShoppingBag size={18} />}
          danger={outOfStock > 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-texto">Pedidos recentes</h2>
              <p className="text-xs text-cinza">Últimas movimentações da loja</p>
            </div>
            <Link href="/admin/pedidos" className="text-xs font-bold text-rosa-profundo">
              Ver todos
            </Link>
          </div>
          <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
            {recentOrders.length === 0 && (
              <div className="rounded-2xl bg-white p-5">
                <p className="text-xs text-cinza">Nenhum pedido ainda.</p>
              </div>
            )}
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/pedidos/${order.id}`}
                className="group flex flex-col gap-3 rounded-2xl bg-white px-4 py-3 transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between"
                style={{ boxShadow: "0 2px 12px rgba(35,20,42,0.06)" }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-texto">
                      #{order.number} — {order.customerName}
                    </p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 text-xs text-cinza">
                    {new Date(order.createdAt).toLocaleDateString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-base font-extrabold text-rosa-profundo">
                    {money(Number(order.total))}
                  </p>
                  <p className="mt-0.5 text-[10px] text-cinza">
                    {STATUS_LABEL[order.status] ?? order.status}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <aside>
          <h2 className="mb-3 text-base font-bold text-texto">Acesso rápido</h2>
          <div
            className="rounded-2xl bg-white p-4"
            style={{ boxShadow: "0 2px 12px rgba(35,20,42,0.06)" }}
          >
            <div className="grid gap-2">
              <QuickLink
                href="/admin/pedidos"
                title="Pedidos"
                description="Acompanhar e finalizar vendas"
              />
              <QuickLink
                href="/admin/produtos"
                title="Produtos"
                description="Estoque, preços e destaques"
              />
              <QuickLink
                href="/admin/categorias"
                title="Categorias"
                description="Organizar o catálogo"
              />
              <QuickLink
                href="/admin/loja"
                title="Loja"
                description="Endereço e informações públicas"
              />
              {session.role === "ADMIN" && (
                <QuickLink
                  href="/admin/usuarios"
                  title="Usuários"
                  description="Acessos e permissões"
                />
              )}
            </div>
          </div>

          {(lowStock > 0 || outOfStock > 0) && (
            <div
              className="mt-4 rounded-2xl bg-white p-4"
              style={{ boxShadow: "0 2px 12px rgba(35,20,42,0.06)" }}
            >
              <p className="mb-2 text-sm font-bold text-texto">Atenção ao estoque</p>
              {lowStock > 0 && (
                <p className="mb-1 text-xs text-cinza">
                  {lowStock} produto{lowStock === 1 ? "" : "s"} com últimas unidades.
                </p>
              )}
              {outOfStock > 0 && (
                <p className="text-xs text-red-600">
                  {outOfStock} produto{outOfStock === 1 ? "" : "s"} sem estoque.
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-3">
                {lowStock > 0 && (
                  <Link
                    href="/admin/produtos?status=ULTIMAS"
                    className="text-xs font-bold text-rosa-profundo"
                  >
                    Ver últimas unidades
                  </Link>
                )}
                {outOfStock > 0 && (
                  <Link
                    href="/admin/produtos?status=INDISPONIVEL"
                    className="text-xs font-bold text-red-600"
                  >
                    Ver sem estoque
                  </Link>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function FinancialCard({
  title,
  value,
  subtitle,
  icon,
  tone,
  href,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: "green" | "gold" | "red";
  href: string;
}) {
  const tones = {
    green: { background: "bg-green-50", text: "text-green-700", icon: "bg-green-100" },
    gold: { background: "bg-amber-50", text: "text-amber-700", icon: "bg-amber-100" },
    red: { background: "bg-red-50", text: "text-red-700", icon: "bg-red-100" },
  };
  const colors = tones[tone];
  return (
    <Link
      href={href}
      className={`${colors.background} rounded-2xl p-5 transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-rosa-profundo/30`}
      style={{ boxShadow: "0 2px 12px rgba(35,20,42,0.05)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-cinza">{title}</p>
          <p className={`mt-2 text-2xl font-extrabold lg:text-3xl ${colors.text}`}>
            {value}
          </p>
          <p className="mt-2 text-[11px] text-cinza">{subtitle}</p>
          <p className="mt-2 text-[10px] font-bold text-cinza">Toque para ver detalhes →</p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.icon} ${colors.text}`}
        >
          {icon}
        </div>
      </div>
    </Link>
  );
}

function SmallCard({
  label,
  value,
  icon,
  href,
  alert = false,
  danger = false,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  href: string;
  alert?: boolean;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-white p-4 transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-rosa-profundo/30"
      style={{ boxShadow: "0 2px 12px rgba(35,20,42,0.06)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p
            className={`text-xl font-extrabold ${
              danger ? "text-red-600" : alert ? "text-amber-600" : "text-texto"
            }`}
          >
            {value}
          </p>
          <p className="mt-1 text-[11px] text-cinza">{label}</p>
        </div>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            danger
              ? "bg-red-50 text-red-600"
              : alert
                ? "bg-amber-50 text-amber-600"
                : "bg-rosa/10 text-rosa-profundo"
          }`}
        >
          {icon}
        </div>
      </div>
    </Link>
  );
}

function QuickLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-rosa/10 p-3 transition hover:bg-rosa/5"
    >
      <p className="text-xs font-bold text-texto">{title}</p>
      <p className="mt-0.5 text-[10px] text-cinza">{description}</p>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === "FINALIZADO"
      ? "bg-green-50 text-green-700"
      : status === "CANCELADO"
        ? "bg-red-50 text-red-700"
        : status === "NOVO"
          ? "bg-rosa/10 text-rosa-profundo"
          : "bg-amber-50 text-amber-700";

  return (
    <span
      className={`hidden whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-bold sm:inline-flex ${classes}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
