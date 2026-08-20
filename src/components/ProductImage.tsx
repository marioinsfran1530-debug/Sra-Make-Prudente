"use client";

import { useEffect, useState } from "react";
import { ImageOff, Sparkles } from "lucide-react";

export function ProductImage({
  name,
  imageUrl,
  className = "",
}: {
  name: string;
  imageUrl?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  if (imageUrl && !failed) {
    return (
      <div
        className={`relative overflow-hidden bg-[#FFF8FA] ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={name}
          onError={() => setFailed(true)}
          className="block h-full w-full object-contain object-center p-1.5"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center relative overflow-hidden text-center ${className}`}
      style={{
        background: "linear-gradient(150deg, #FFF6FA 0%, #FBE4EF 55%, #F3D9EA 100%)",
      }}
      aria-label={`Imagem indisponível para ${name}`}
    >
      <ImageOff size={20} className="text-rosa-profundo/55" />
      <span className="mt-1 px-2 text-[9px] font-semibold leading-tight text-rosa-profundo/65">
        Imagem indisponível
      </span>
      <Sparkles
        className="absolute"
        style={{ color: "#C9972E", opacity: 0.3, width: 14, height: 14, top: 7, right: 8 }}
      />
    </div>
  );
}
