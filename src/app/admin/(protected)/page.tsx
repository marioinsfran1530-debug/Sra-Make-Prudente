import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";
import { computeStockStatus } from "@/lib/stock";
import { money } from "@/lib/money";

export default async function AdminDashboardPage() {
  const session = await getAdminSession();

  if (!session) {
    return null;
  }

  const [
    activeProducts,
    newOrders,
    confirmingOrders,
    allProducts,
    recentOrders,
  ] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.order.count({ where: { status: "NOVO" } }),
    prisma.order.count({ where: { status: "EM_CONFIRMACAO" } }),
    prisma.product.findMany({
      where: { active: true },
      select: { stockQty: true },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const lowStock = allProducts.filter(
    (p) => computeStockStatus(p.stockQty) === "ULTIMAS"
  ).length;

  const outOfStock = allProducts.filter(
    (p) => computeStockStatus(p.stockQty) === "INDISPONIVEL"
  ).length;

  return (
    <div>
      <h1 className="font-serif font-bold text-xl text-texto mb-4">
        Dashboard
      </h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Produtos ativos" value={activeProducts} />
        <StatCard label="Pedidos novos" value={newOrders} tone="rosa" />
        <StatCard
          label="Em confirmação"
          value={confirmingOrders}
          tone="dourado"
        />
        <StatCard
          label="Últimas unidades"
          value={lowStock}
          tone="dourado"
        />
        <StatCard
          label="Indisponíveis"
          value={outOfStock}
          tone="vermelho"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/admin/produtos"
          className="text-xs font-bold px-3 py-2 rounded-full bg-rosa text-white"
        >
          Gerenciar produtos
        </Link>

        <Link
          href="/admin/categorias"
          className="text-xs font-bold px-3 py-2 rounded-full border border-rosa/30 text-texto"
        >
          Categorias
        </Link>

        <Link
          href="/admin/pedidos"
          className="text-xs font-bold px-3 py-2 rounded-full border border-rosa/30 text-texto"
        >
          Pedidos
        </Link>

        {session.role === "ADMIN" && (
          <Link
            href="/admin/usuarios"
            className="text-xs font-bold px-3 py-2 rounded-full border border-rosa/30 text-texto"
          >
            Usuários
          </Link>
        )}
      </div>

      <p className="font-bold text-sm text-texto mb-2">
        Pedidos recentes
      </p>

      <div className="flex flex-col gap-2">
        {recentOrders.length === 0 && (
          <p className="text-xs text-cinza">
            Nenhum pedido ainda.
          </p>
        )}

        {recentOrders.map((o) => (
          <Link
            key={o.id}
            href={`/admin/pedidos/${o.id}`}
            className="flex items-center justify-between bg-white rounded-xl px-4 py-3"
            style={{
              boxShadow: "0 2px 10px rgba(35,20,42,0.06)",
            }}
          >
            <div>
              <p className="text-sm font-bold text-texto">
                #{o.number} — {o.customerName}
              </p>

              <p className="text-xs text-cinza">
                {new Date(o.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm font-extrabold text-rosa-profundo">
                {money(Number(o.total))}
              </p>

              <p className="text-xs text-cinza">
                {o.status}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "rosa" | "dourado" | "vermelho";
}) {
  const colors = {
    default: "#23142A",
    rosa: "#E4127B",
    dourado: "#C9972E",
    vermelho: "#E11D2E",
  };

  return (
    <div
      className="bg-white rounded-2xl p-4"
      style={{
        boxShadow: "0 2px 10px rgba(35,20,42,0.06)",
      }}
    >
      <p
        className="text-2xl font-extrabold"
        style={{ color: colors[tone] }}
      >
        {value}
      </p>

      <p className="text-xs text-cinza mt-1">
        {label}
      </p>
    </div>
  );
}
