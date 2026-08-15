import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NovoProdutoPage() {
  const categories = await prisma.category.findMany({
    include: { subcategories: true },
    orderBy: { order: "asc" },
  });

  return (
    <div>
      <h1 className="font-serif font-bold text-xl text-texto mb-4">Novo produto</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
