import Link from "next/link";
import {
  Palette,
  Eye,
  Hand,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {categories.map((cat) => {
        const Icon = ICONS[cat.slug] ?? ShoppingBag;

        return (
          <Link
            key={cat.slug}
            href={`/categoria/${cat.slug}`}
            className="group rounded-2xl bg-white border border-rosa/15 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition px-3 py-4 flex flex-col items-center justify-center text-center min-h-[110px]"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-creme border border-rosa/10 mb-2 group-hover:bg-rosa/5 transition">
              <Icon
                size={22}
                className="text-rosa-profundo"
              />
            </div>

            <span className="text-xs font-semibold text-texto leading-snug">
              {cat.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}