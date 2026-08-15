import { prisma } from "@/lib/prisma";
import { CategoriesManager } from "@/components/admin/CategoriesManager";

export default async function AdminCategoriasPage() {
  const categories = await prisma.category.findMany({
    include: { subcategories: true },
    orderBy: { order: "asc" },
  });

  return (
    <div>
      <h1 className="font-serif font-bold text-xl text-texto mb-4">Categorias</h1>
      <CategoriesManager categories={categories} />
    </div>
  );
}
