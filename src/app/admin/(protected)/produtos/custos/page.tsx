import { prisma } from "@/lib/prisma";
import { CostEditor, type CostRow } from "@/components/admin/CostEditor";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 90;

export default async function AdminCustosPage() {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [products, sales] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        brand: true,
        price: true,
        costPrice: true,
        stockQty: true,
        variants: { where: { active: true }, select: { stockQty: true } },
      },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { status: "FINALIZADO", updatedAt: { gte: since } } },
      _sum: { qty: true },
    }),
  ]);

  const unitsByProduct = new Map(sales.map((row) => [row.productId, row._sum.qty ?? 0]));

  const rows: CostRow[] = products
    .map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: Number(product.price),
      costPrice: product.costPrice === null ? null : Number(product.costPrice),
      stockQty: product.variants.length
        ? product.variants.reduce((sum, variant) => sum + variant.stockQty, 0)
        : product.stockQty,
      unitsSold: unitsByProduct.get(product.id) ?? 0,
    }))
    // Quem mais vende vem primeiro: poucos custos cadastrados já cobrem quase todo o faturamento.
    .sort((a, b) => b.unitsSold - a.unitsSold || a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-rosa-profundo">Margem e compras</p>
        <h1 className="font-serif text-xl font-bold text-texto">Custos dos produtos</h1>
        <p className="mt-1 text-xs text-cinza">
          Informe quanto você pagou em cada produto, começando pelos que mais vendem. Com o custo, o painel passa a mostrar
          a margem real e o lucro de cada venda.
        </p>
      </div>
      <CostEditor rows={rows} periodLabel={`últimos ${WINDOW_DAYS} dias`} />
    </div>
  );
}
