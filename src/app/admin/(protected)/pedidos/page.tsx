import Link from "next/link";
import { prisma } from "@/lib/prisma";
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

export default async function AdminPedidosPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="font-serif font-bold text-xl text-texto mb-4">Pedidos</h1>
      <div className="flex flex-col gap-2">
        {orders.length === 0 && <p className="text-xs text-cinza">Nenhum pedido ainda.</p>}
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/admin/pedidos/${o.id}`}
            className="flex items-center justify-between bg-white rounded-xl px-4 py-3"
            style={{ boxShadow: "0 2px 10px rgba(35,20,42,0.06)" }}
          >
            <div>
              <p className="text-sm font-bold text-texto">
                #{o.number} — {o.customerName}
              </p>
              <p className="text-xs text-cinza">
                {new Date(o.createdAt).toLocaleDateString("pt-BR")} · {STATUS_LABEL[o.status]}
              </p>
            </div>
            <p className="text-sm font-extrabold text-rosa-profundo">{money(Number(o.total))}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
