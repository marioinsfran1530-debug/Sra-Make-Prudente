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
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4">
        <h1 className="font-serif text-xl font-bold text-texto">Pedidos</h1>
        <p className="mt-1 text-xs text-cinza">
          Priorize novos pedidos, acompanhe os que estão em andamento e encontre clientes rapidamente.
        </p>
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
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
