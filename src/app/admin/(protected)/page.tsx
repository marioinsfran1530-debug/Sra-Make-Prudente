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

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
  };
}

function saoPauloMidnightUtc(
  year: number,
  month: number,
  day: number
) {
  // Presidente Prudente / São Paulo: UTC-3.
  // 00:00 local = 03:00 UTC.
  return new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
}

function getPeriodRange(period: Period) {
  if (period === "all") {
    return null;
  }

  const { year, month, day } = getSaoPauloDateParts();

  const todayStart = saoPauloMidnightUtc(year, month, day);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

  if (period === "today") {
    return {
      gte: todayStart,
      lt: tomorrowStart,
    };
  }

  if (period === "7d") {
    const start = new Date(todayStart);
    start.setUTCDate(start.getUTCDate() - 6);

    return {
      gte: start,
      lt: tomorrowStart,
    };
  }

  if (period === "30d") {
    const start = new Date(todayStart);
    start.setUTCDate(start.getUTCDate() - 29);

    return {
      gte: start,
      lt: tomorrowStart,
    };
  }

  return {
    gte: saoPauloMidnightUtc(year, month, 1),
    lt: tomorrowStart,
  };
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: { period?: string };
}) {
  const session = await getAdminSession();

  if (!session) {
    return null;
  }

  const requestedPeriod = searchParams?.period;

  const period: Period = PERIODS.some(
    (item) => item.value === requestedPeriod
  )
    ? (requestedPeriod as Period)
    : "today";

  const range = getPeriodRange(period);

  const finalizedDateFilter = range
    ? {
        updatedAt: range,
      }
    : {};

  const canceledDateFilter = range
    ? {
        updatedAt: range,
      }
    : {};

  const pendingDateFilter = range
    ? {
        createdAt: range,
      }
    : {};

  const [
    activeProducts,
    allProducts,
    recentOrders,
    finalizedOrders,
    pendingOrders,
    canceledOrders,
  ] = await Promise.all([
    prisma.product.count({
      where: { active: true },
    }),

    prisma.product.findMany({
      where: { active: true },
      select: { stockQty: true },
    }),

    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
    }),

    prisma.order.aggregate({
      where: {
        status: "FINALIZADO",
        ...finalizedDateFilter,
      },
      _sum: {
        total: true,
      },
      _count: {
        id: true,
      },
    }),

    prisma.order.aggregate({
      where: {
        status: {
          in: [...PENDING_STATUSES],
        },
        ...pendingDateFilter,
      },
      _sum: {
        total: true,
      },
      _count: {
        id: true,
      },
    }),

    prisma.order.aggregate({
      where: {
        status: "CANCELADO",
        ...canceledDateFilter,
      },
      _sum: {
        total: true,
      },
      _count: {
        id: true,
      },
    }),
  ]);

  const soldValue = Number(finalizedOrders._sum.total ?? 0);
  const pendingValue = Number(pendingOrders._sum.total ?? 0);
  const canceledValue = Number(canceledOrders._sum.total ?? 0);

  const finalizedCount = finalizedOrders._count.id;
  const pendingCount = pendingOrders._count.id;
  const canceledCount = canceledOrders._count.id;

  const averageTicket =
    finalizedCount > 0
      ? soldValue / finalizedCount
      : 0;

  const lowStock = allProducts.filter(
    (product) =>
      computeStockStatus(product.stockQty) === "ULTIMAS"
  ).length;

  const outOfStock = allProducts.filter(
    (product) =>
      computeStockStatus(product.stockQty) === "INDISPONIVEL"
  ).length;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo mb-1">
          Visão geral
        </p>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="font-serif font-bold text-2xl text-texto">
              Dashboard
            </h1>

            <p className="text-sm text-cinza mt-1">
              Acompanhe vendas, pedidos e estoque da loja.
            </p>
          </div>

          <Link
            href="/admin/pedidos"
            className="text-xs font-bold px-4 py-2.5 rounded-xl text-white text-center"
            style={{ backgroundColor: "#E4127B" }}
          >
            Ver pedidos
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-[11px] font-bold text-texto mb-2">
          Período das vendas
        </p>

        <div className="flex flex-wrap gap-2">
          {PERIODS.map((item) => {
            const active = period === item.value;

            return (
              <Link
                key={item.value}
                href={
                  item.value === "today"
                    ? "/admin"
                    : `/admin?period=${item.value}`
                }
                className={`text-xs font-bold px-3 py-2 rounded-xl border transition ${
                  active
                    ? "text-white border-rosa-profundo"
                    : "bg-white text-texto border-rosa/20 hover:bg-rosa/5"
                }`}
                style={
                  active
                    ? { backgroundColor: "#E4127B" }
                    : undefined
                }
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <FinancialCard
          title="Vendido"
          value={money(soldValue)}
          subtitle={`${finalizedCount} ${
            finalizedCount === 1
              ? "venda finalizada"
              : "vendas finalizadas"
          }`}
          icon={<CheckCircle2 size={20} />}
          tone="green"
        />

        <FinancialCard
          title="Pendente"
          value={money(pendingValue)}
          subtitle={`${pendingCount} ${
            pendingCount === 1
              ? "pedido em andamento"
              : "pedidos em andamento"
          }`}
          icon={<Clock3 size={20} />}
          tone="gold"
        />

        <FinancialCard
          title="Cancelado"
          value={money(canceledValue)}
          subtitle={`${canceledCount} ${
            canceledCount === 1
              ? "pedido cancelado"
              : "pedidos cancelados"
          }`}
          icon={<XCircle size={20} />}
          tone="red"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SmallCard
          label="Ticket médio"
          value={money(averageTicket)}
          icon={<TrendingUp size={18} />}
        />

        <SmallCard
          label="Produtos ativos"
          value={activeProducts}
          icon={<Package size={18} />}
        />

        <SmallCard
          label="Últimas unidades"
          value={lowStock}
          icon={<AlertTriangle size={18} />}
          alert={lowStock > 0}
        />

        <SmallCard
          label="Sem estoque"
          value={outOfStock}
          icon={<ShoppingBag size={18} />}
          danger={outOfStock > 0}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)] gap-5">
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-base text-texto">
                Pedidos recentes
              </h2>

              <p className="text-xs text-cinza">
                Últimas movimentações da loja
              </p>
            </div>

            <Link
              href="/admin/pedidos"
              className="text-xs font-bold text-rosa-profundo"
            >
              Ver todos
            </Link>
          </div>

          <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
            {recentOrders.length === 0 && (
              <div className="bg-white rounded-2xl p-5">
                <p className="text-xs text-cinza">
                  Nenhum pedido ainda.
                </p>
              </div>
            )}

            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/pedidos/${order.id}`}
                className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-2xl px-4 py-3 transition hover:-translate-y-0.5"
                style={{
                  boxShadow:
                    "0 2px 12px rgba(35,20,42,0.06)",
                }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-texto truncate">
                      #{order.number} — {order.customerName}
                    </p>

                    <StatusBadge status={order.status} />
                  </div>

                  <p className="text-xs text-cinza mt-1">
                    {new Date(
                      order.createdAt
                    ).toLocaleDateString("pt-BR", {
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

                  <p className="text-[10px] text-cinza mt-0.5">
                    {STATUS_LABEL[order.status] ??
                      order.status}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <aside>
          <h2 className="font-bold text-base text-texto mb-3">
            Acesso rápido
          </h2>

          <div
            className="bg-white rounded-2xl p-4"
            style={{
              boxShadow:
                "0 2px 12px rgba(35,20,42,0.06)",
            }}
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
              className="bg-white rounded-2xl p-4 mt-4"
              style={{
                boxShadow:
                  "0 2px 12px rgba(35,20,42,0.06)",
              }}
            >
              <p className="font-bold text-sm text-texto mb-2">
                Atenção ao estoque
              </p>

              {lowStock > 0 && (
                <p className="text-xs text-cinza mb-1">
                  {lowStock} produto
                  {lowStock === 1 ? "" : "s"} com últimas
                  unidades.
                </p>
              )}

              {outOfStock > 0 && (
                <p className="text-xs text-red-600">
                  {outOfStock} produto
                  {outOfStock === 1 ? "" : "s"} sem estoque.
                </p>
              )}

              <Link
                href="/admin/produtos"
                className="inline-block text-xs font-bold text-rosa-profundo mt-3"
              >
                Revisar estoque
              </Link>
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
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: "green" | "gold" | "red";
}) {
  const tones = {
    green: {
      background: "bg-green-50",
      text: "text-green-700",
      icon: "bg-green-100",
    },
    gold: {
      background: "bg-amber-50",
      text: "text-amber-700",
      icon: "bg-amber-100",
    },
    red: {
      background: "bg-red-50",
      text: "text-red-700",
      icon: "bg-red-100",
    },
  };

  const colors = tones[tone];

  return (
    <div
      className={`${colors.background} rounded-2xl p-5`}
      style={{
        boxShadow: "0 2px 12px rgba(35,20,42,0.05)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-cinza">
            {title}
          </p>

          <p
            className={`text-2xl lg:text-3xl font-extrabold mt-2 ${colors.text}`}
          >
            {value}
          </p>

          <p className="text-[11px] text-cinza mt-2">
            {subtitle}
          </p>
        </div>

        <div
          className={`w-10 h-10 flex items-center justify-center rounded-xl ${colors.icon} ${colors.text}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function SmallCard({
  label,
  value,
  icon,
  alert = false,
  danger = false,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  alert?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className="bg-white rounded-2xl p-4"
      style={{
        boxShadow: "0 2px 12px rgba(35,20,42,0.06)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p
            className={`text-xl font-extrabold ${
              danger
                ? "text-red-600"
                : alert
                  ? "text-amber-600"
                  : "text-texto"
            }`}
          >
            {value}
          </p>

          <p className="text-[11px] text-cinza mt-1">
            {label}
          </p>
        </div>

        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
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
    </div>
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
      className="rounded-xl border border-rosa/10 p-3 hover:bg-rosa/5 transition"
    >
      <p className="text-xs font-bold text-texto">
        {title}
      </p>

      <p className="text-[10px] text-cinza mt-0.5">
        {description}
      </p>
    </Link>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
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
      className={`hidden sm:inline-flex text-[9px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${classes}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
