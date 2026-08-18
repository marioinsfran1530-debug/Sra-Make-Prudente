"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import type { PublicProduct } from "@/lib/data";

export function ProductCarousel({
  products,
}: {
  products: PublicProduct[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(direction: "left" | "right") {
    const element = scrollRef.current;

    if (!element) return;

    const distance = Math.max(
      220,
      Math.min(element.clientWidth * 0.85, 900)
    );

    element.scrollBy({
      left: direction === "right" ? distance : -distance,
      behavior: "smooth",
    });
  }

  return (
    <div className="relative group/carousel">
      {/* SETA ESQUERDA */}
      {products.length > 4 && (
        <button
          type="button"
          onClick={() => scroll("left")}
          aria-label="Produtos anteriores"
          className="
            hidden md:flex
            absolute left-3 top-1/2 -translate-y-1/2 z-20
            w-11 h-11 items-center justify-center
            rounded-full bg-white/95
            border border-rosa/20
            shadow-lg text-rosa-profundo
            opacity-0 group-hover/carousel:opacity-100
            hover:scale-105
            transition
          "
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {/* PRODUTOS */}
      <div
        ref={scrollRef}
        className="
          flex gap-3 md:gap-4
          overflow-x-auto
          px-4 pb-4
          scroll-smooth
          snap-x snap-mandatory
          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="
              flex flex-none snap-start

              w-[72vw]
              max-w-[190px]

              sm:w-[190px]
              md:w-[205px]
              lg:w-[215px]
              xl:w-[225px]
            "
          >
            <ProductCard product={product} />
          </div>
        ))}

        <div
          className="w-1 flex-none"
          aria-hidden="true"
        />
      </div>

      {/* SETA DIREITA */}
      {products.length > 4 && (
        <button
          type="button"
          onClick={() => scroll("right")}
          aria-label="Próximos produtos"
          className="
            hidden md:flex
            absolute right-3 top-1/2 -translate-y-1/2 z-20
            w-11 h-11 items-center justify-center
            rounded-full bg-white/95
            border border-rosa/20
            shadow-lg text-rosa-profundo
            opacity-0 group-hover/carousel:opacity-100
            hover:scale-105
            transition
          "
        >
          <ChevronRight size={22} />
        </button>
      )}
    </div>
  );
}
