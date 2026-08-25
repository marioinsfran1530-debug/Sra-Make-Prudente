import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NovoProdutoPage() {
  const categories = await prisma.category.findMany({
    include: { subcategories: true },
    orderBy: { order: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <h1 className="font-serif text-xl font-bold text-texto">Novo produto</h1>
        <p className="mt-1 text-xs leading-5 text-cinza">
          Preencha os dados principais. Informações opcionais podem ser completadas depois sem impedir o cadastro.
        </p>
      </div>

      <ProductForm categories={categories} />
    </div>
  );
}
