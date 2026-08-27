import Link from "next/link";
import {
  Baby,
  ChevronRight,
  Eye,
  Gem,
  Gift,
  Hand,
  Package,
  Palette,
  Search,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  make: Palette,
  maquiagem: Palette,
  lash: Eye,
  "lash-design": Eye,
  cilios: Eye,
  nail: Hand,
  "nail-design": Hand,
  acessorios: Gem,
  cosmeticos: Sparkles,
  skincare: Sparkles,
  presentes: Gift,
  "kits-promocionais": Package,
  kits: Package,
  "produtos-infantis": Baby,
  infantil: Baby,
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

export function HomeCategoryRail({
  categories,
}: {
  categories: { name: string; slug: string }[];
}) {
  if (categories.length === 0) return null;

  return (
    <section className="mt-5">
      <div className="mb-3 flex items-end justify-between gap-3 px-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rosa-profundo">
            Encontre mais rápido
          </p>
          <h2 className="mt-0.5 font-serif text-lg font-bold text-texto">
            O que você procura hoje?
          </h2>
        </div>
        <Link
          href="/categoria"
          className="inline-flex shrink-0 items-center gap-0.5 text-xs font-bold text-rosa-profundo"
        >
          Ver todas <ChevronRight size={14} />
        </Link>
      </div>

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((category) => {
          const slug = normalize(category.slug);
          const name = normalize(category.name);
          const Icon = CATEGORY_ICONS[slug] ?? CATEGORY_ICONS[name] ?? ShoppingBag;

          return (
            <Link
              key={category.slug}
              href={`/categoria/${category.slug}`}
              className="group flex w-[84px] flex-none snap-start flex-col items-center text-center"
            >
              <span className="flex h-[66px] w-[66px] items-center justify-center rounded-full border border-rosa/15 bg-white shadow-sm transition group-hover:-translate-y-0.5 group-hover:border-rosa/30 group-hover:shadow-md">
                <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-creme text-rosa-profundo">
                  <Icon size={23} strokeWidth={1.8} />
                </span>
              </span>
              <span className="mt-2 line-clamp-2 text-[11px] font-semibold leading-tight text-texto">
                {category.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function BrandRail({ brands }: { brands: string[] }) {
  if (brands.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between gap-3 px-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rosa-profundo">
            Seus favoritos
          </p>
          <h2 className="mt-0.5 font-serif text-lg font-bold text-texto">
            Compre por marca
          </h2>
        </div>
        <Link
          href="/busca"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-rosa-profundo"
        >
          <Search size={13} /> Buscar
        </Link>
      </div>

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {brands.map((brand) => {
          const initial = brand.trim().charAt(0).toUpperCase() || "S";

          return (
            <Link
              key={brand}
              href={`/busca?q=${encodeURIComponent(brand)}`}
              className="group flex min-h-[88px] w-[132px] flex-none snap-start items-center gap-3 rounded-2xl border border-rosa/10 bg-white px-3 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-rosa/25 hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-creme font-serif text-base font-bold text-rosa-profundo">
                {initial}
              </span>
              <span className="min-w-0 text-xs font-bold leading-tight text-texto">
                {brand}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
