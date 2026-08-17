"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  slug: string;
  subcategories: {
    id: string;
    name: string;
    slug: string;
  }[];
};

export function CatalogCategoryNav({
  categories,
  activeCategory,
}: {
  categories: Category[];
  activeCategory?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDesktop, setOpenDesktop] = useState<string | null>(null);
  const [openMobile, setOpenMobile] = useState<string | null>(null);

  return (
    <>
      {/* DESKTOP */}
      <div className="hidden lg:block sticky top-0 z-40 px-4 mb-4 bg-[#FFF7FB]/95 backdrop-blur-sm py-2">
        <div className="relative flex items-center gap-2 rounded-2xl bg-white border border-rosa/10 shadow-md px-3 py-2">
          <Link
            href="/categoria"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              !activeCategory
                ? "bg-rosa-profundo text-white"
                : "text-texto hover:bg-rosa/5"
            }`}
          >
            Todos os produtos
          </Link>

          {categories.map((category) => {
            const opened = openDesktop === category.slug;

            return (
              <div
                key={category.id}
                className="relative"
                onMouseEnter={() => setOpenDesktop(category.slug)}
                onMouseLeave={() => setOpenDesktop(null)}
              >
                <Link
                  href={`/categoria/${category.slug}`}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition ${
                    activeCategory === category.slug
                      ? "bg-rosa-profundo text-white"
                      : "text-texto hover:bg-rosa/5"
                  }`}
                >
                  {category.name}

                  {category.subcategories.length > 0 && (
                    <ChevronDown size={13} />
                  )}
                </Link>

                {opened && category.subcategories.length > 0 && (
                  <div
                    className="absolute left-0 top-full pt-2 z-50"
                    onMouseEnter={() => setOpenDesktop(category.slug)}
                    onMouseLeave={() => setOpenDesktop(null)}
                  >
                    <div className="w-64 rounded-2xl bg-white border border-rosa/10 shadow-xl p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-cinza px-2 mb-2">
                        {category.name}
                      </p>

                      <Link
                        href={`/categoria/${category.slug}`}
                        className="block px-3 py-2 rounded-xl text-xs font-bold text-rosa-profundo hover:bg-rosa/5"
                      >
                        Ver todos
                      </Link>

                      {category.subcategories.map((sub) => (
                        <Link
                          key={sub.id}
                          href={`/categoria/${category.slug}?subcategoria=${sub.slug}`}
                          className="block px-3 py-2 rounded-xl text-xs text-texto hover:bg-rosa/5"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MOBILE */}
      <div className="lg:hidden sticky top-0 z-40 px-4 mb-4 bg-[#FFF7FB]/95 backdrop-blur-sm py-2">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="w-full flex items-center justify-between rounded-xl bg-white border border-rosa/15 shadow-md px-4 py-3"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-texto">
            <Menu size={18} className="text-rosa-profundo" />
            Categorias
          </span>

          <ChevronRight size={18} className="text-cinza" />
        </button>
      </div>

      {/* MENU LATERAL MOBILE */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Fechar categorias"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/35"
          />

          <aside className="absolute left-0 top-0 bottom-0 w-[86%] max-w-[360px] bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-4 py-4 border-b border-rosa/10">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-rosa-profundo">
                  Catálogo
                </p>

                <p className="font-serif font-bold text-lg text-texto">
                  Categorias
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="w-10 h-10 rounded-full bg-creme flex items-center justify-center text-rosa-profundo"
                aria-label="Fechar menu"
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-3">
              <Link
                href="/categoria"
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-xl font-bold text-sm ${
                  !activeCategory
                    ? "bg-rosa-profundo text-white"
                    : "text-rosa-profundo hover:bg-rosa/5"
                }`}
              >
                Todos os produtos
              </Link>

              {categories.map((category) => {
                const opened = openMobile === category.slug;
                const active = activeCategory === category.slug;

                return (
                  <div
                    key={category.id}
                    className="border-t border-rosa/10"
                  >
                    <div className="flex items-center">
                      <Link
                        href={`/categoria/${category.slug}`}
                        onClick={() => setMobileOpen(false)}
                        className={`flex-1 px-4 py-3 text-sm font-bold ${
                          active
                            ? "text-rosa-profundo"
                            : "text-texto"
                        }`}
                      >
                        {category.name}
                      </Link>

                      {category.subcategories.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMobile(
                              opened ? null : category.slug
                            )
                          }
                          className="w-12 h-12 flex items-center justify-center text-rosa-profundo"
                          aria-label={`Subcategorias de ${category.name}`}
                        >
                          <ChevronDown
                            size={17}
                            className={`transition ${
                              opened ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    {opened && category.subcategories.length > 0 && (
                      <div className="pb-2 pl-4">
                        <Link
                          href={`/categoria/${category.slug}`}
                          onClick={() => setMobileOpen(false)}
                          className="block px-4 py-2.5 text-xs font-bold text-rosa-profundo rounded-xl hover:bg-rosa/5"
                        >
                          Ver todos
                        </Link>

                        {category.subcategories.map((sub) => (
                          <Link
                            key={sub.id}
                            href={`/categoria/${category.slug}?subcategoria=${sub.slug}`}
                            onClick={() => setMobileOpen(false)}
                            className="block px-4 py-2.5 text-xs text-cinza rounded-xl hover:bg-rosa/5"
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}