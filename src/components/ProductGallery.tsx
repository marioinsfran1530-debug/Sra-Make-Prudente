"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";

type GalleryImage = {
  id?: string;
  url: string;
};

export function ProductGallery({
  name,
  images,
}: {
  name: string;
  images: GalleryImage[];
}) {
  const safeImages = images.length > 0 ? images : [{ url: "" }];
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const hasMultiple = safeImages.length > 1;

  function previous() {
    setIndex((current) =>
      current === 0 ? safeImages.length - 1 : current - 1
    );
  }

  function next() {
    setIndex((current) =>
      current === safeImages.length - 1 ? 0 : current + 1
    );
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (!hasMultiple || touchStartX.current === null) return;

    const endX = event.changedTouches[0]?.clientX;
    if (typeof endX !== "number") return;

    const distance = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(distance) < 45) return;
    if (distance < 0) next();
    else previous();
  }

  const currentImage = safeImages[index]?.url || null;

  return (
    <div className="space-y-3">
      <div
        className="relative overflow-hidden rounded-3xl border border-rosa/10 bg-white"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <ProductImage
          name={name}
          imageUrl={currentImage}
          className="w-full aspect-square lg:h-[calc(100vh-150px)] lg:max-h-[620px]"
        />

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={previous}
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-texto shadow-md ring-1 ring-black/5"
              aria-label="Imagem anterior"
            >
              <ChevronLeft size={19} />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-texto shadow-md ring-1 ring-black/5"
              aria-label="Próxima imagem"
            >
              <ChevronRight size={19} />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white">
              {index + 1}/{safeImages.length}
            </span>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {safeImages.map((image, imageIndex) => (
            <button
              key={image.id ?? `${image.url}-${imageIndex}`}
              type="button"
              onClick={() => setIndex(imageIndex)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition ${
                imageIndex === index
                  ? "border-rosa-profundo"
                  : "border-transparent opacity-70"
              }`}
              aria-label={`Ver imagem ${imageIndex + 1}`}
              aria-current={imageIndex === index ? "true" : undefined}
            >
              <ProductImage
                name={`${name} - imagem ${imageIndex + 1}`}
                imageUrl={image.url || null}
                className="h-full w-full"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
