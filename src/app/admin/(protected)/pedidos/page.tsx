import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { OrdersTable } from "@/components/admin/OrdersTable";

export default async function AdminPedidosPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; period?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      number: true,
      customerName: true,
      customerPhone: true,
      total: true,
      status: true,
      channel: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold text-texto">Pedidos e vendas</h1>
          <p className="mt-1 text-xs text-cinza">
            Catálogo e loja física no mesmo histórico operacional.
          </p>
        </div>
        <Link href="/admin/vendas/nova" className="shrink-0 rounded-xl bg-rosa-profundo px-4 py-2.5 text-xs font-extrabold text-white">
          + Nova venda
        </Link>
      </div>

      <OrdersTable
        initialStatus={params?.status ?? ""}
        initialPeriod={params?.period ?? "30d"}
        orders={orders.map((order) => ({
          id: order.id,
          number: order.number,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          total: Number(order.total),
          status: order.status,
          channel: order.channel,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
