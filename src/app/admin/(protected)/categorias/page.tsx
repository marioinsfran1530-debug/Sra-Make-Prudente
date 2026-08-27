import { prisma } from "@/lib/prisma";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
import { HomeMerchandisingManager } from "@/components/admin/HomeMerchandisingManager";
import {
  getHomeBrandSettings,
  getHomeCategoryVisibility,
} from "@/lib/home-merchandising";

export default async function AdminCategoriasPage() {
  const [categories, brandGroups, categoryVisibility, brandSettings] = await Promise.all([
    prisma.category.findMany({
      include: { subcategories: true },
      orderBy: { order: "asc" },
    }),
    prisma.product.groupBy({
      by: ["brand"],
      where: { active: true },
      _count: { _all: true },
    }),
    getHomeCategoryVisibility(),
    getHomeBrandSettings(),
  ]);

  const homeCategories = categories.map((category) => ({
    id: category.id,
    name: category.name,
    order: category.order,
    showOnHome: categoryVisibility.get(category.id) ?? true,
  }));

  const brands = brandGroups
    .map((item) => ({ name: item.brand.trim(), count: item._count._all }))
    .filter((item) => Boolean(item.name));

  return (
    <div>
      <h1 className="mb-1 font-serif text-xl font-bold text-texto">Categorias</h1>
      <p className="mb-4 text-xs leading-5 text-cinza">
        Organize a estrutura do catálogo e a prioridade comercial da Home.
      </p>

      <HomeMerchandisingManager
        categories={homeCategories}
        brands={brands}
        brandOrder={brandSettings.homeBrandOrder}
        hiddenBrands={brandSettings.homeHiddenBrands}
      />

      <CategoriesManager categories={categories} />
    </div>
  );
}
