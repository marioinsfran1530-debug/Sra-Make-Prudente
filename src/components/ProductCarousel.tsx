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

    const distance = Math.min(element.clientWidth * 0.8, 700);

    element.scrollBy({
      left: direction === "right" ? distance : -distance,
      behavior: "smooth",
    });
  }

  return (
    <div className="relative group/carousel">
      <button
        type="button"
        onClick={() => scroll("left")}
        aria-label="Produtos anteriores"
        className="
          hidden md:flex
          absolute left-2 top-1/2 -translate-y-1/2 z-10
          w-10 h-10 items-center justify-center
          rounded-full bg-white border border-rosa/15
          shadow-md text-rosa-profundo
          opacity-0 group-hover/carousel:opacity-100
          hover:shadow-lg hover:scale-105
          transition
        "
      >
        <ChevronLeft size={21} />
      </button>

      <div
        ref={scrollRef}
        className="
          flex gap-3 overflow-x-auto
          px-4 pb-3
          scroll-smooth snap-x snap-mandatory
          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="
              flex flex-none snap-start
              w-[72vw] max-w-[180px]
              sm:w-[180px]
            "
          >
            <ProductCard product={product} />
          </div>
        ))}

        <div className="w-1 flex-none" aria-hidden="true" />
      </div>

      <button
        type="button"
        onClick={() => scroll("right")}
        aria-label="Próximos produtos"
        className="
          hidden md:flex
          absolute right-2 top-1/2 -translate-y-1/2 z-10
          w-10 h-10 items-center justify-center
          rounded-full bg-white border border-rosa/15
          shadow-md text-rosa-profundo
          opacity-0 group-hover/carousel:opacity-100
          hover:shadow-lg hover:scale-105
          transition
        "
      >
        <ChevronRight size={21} />
      </button>
    </div>
  );
}
