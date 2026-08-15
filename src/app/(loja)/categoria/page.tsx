export const dynamic = "force-dynamic";
import Link from "next/link";
import { ChevronRight, Palette, Eye, Hand, ShoppingBag, type LucideIcon } from "lucide-react";
import { getCategories } from "@/lib/data";

const ICONS: Record<string, LucideIcon> = {
  make: Palette,
  lash: Eye,
  nail: Hand,
  acessorios: ShoppingBag,
};

export const revalidate = 60;

export default async function CategoriasIndexPage() {
  const categories = await getCategories();

  return (
    <main className="px-4 pt-4">
      <p className="font-serif font-bold text-xl mb-4 text-texto">Categorias</p>
      <div className="flex flex-col gap-3">
        {categories.map((cat) => {
          const Icon = ICONS[cat.slug] ?? ShoppingBag;
          return (
            <Link
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              className="flex items-center gap-4 rounded-2xl p-4 bg-white"
              style={{ boxShadow: "0 2px 14px rgba(35,20,42,0.06)" }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-creme">
                <Icon size={22} className="text-rosa-profundo" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-texto">{cat.name}</p>
                <p className="text-xs text-cinza">{cat.subcategories.length} subcategorias</p>
              </div>
              <ChevronRight size={18} className="text-cinza" />
            </Link>
          );
        })}
      </div>
    </main>
  );
}
