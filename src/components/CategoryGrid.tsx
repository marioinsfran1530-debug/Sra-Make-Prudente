import Link from "next/link";
import { Palette, Eye, Hand, ShoppingBag, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  make: Palette,
  lash: Eye,
  nail: Hand,
  acessorios: ShoppingBag,
};

export function CategoryGrid({
  categories,
}: {
  categories: { name: string; slug: string }[];
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {categories.map((cat) => {
        const Icon = ICONS[cat.slug] ?? ShoppingBag;
        return (
          <Link
            key={cat.slug}
            href={`/categoria/${cat.slug}`}
            className="flex flex-col items-center gap-1.5"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-creme">
              <Icon size={24} className="text-rosa-profundo" />
            </div>
            <span className="text-xs font-semibold text-texto">{cat.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
