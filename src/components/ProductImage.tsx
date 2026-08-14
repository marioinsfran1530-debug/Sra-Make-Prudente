import { Sparkles } from "lucide-react";

export function ProductImage({
  name,
  imageUrl,
  className = "",
}: {
  name: string;
  imageUrl?: string | null;
  className?: string;
}) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={name} className={`object-cover ${className}`} />;
  }

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={`flex items-center justify-center relative overflow-hidden ${className}`}
      style={{
        background: "linear-gradient(150deg, #FFF6FA 0%, #FBE4EF 55%, #F3D9EA 100%)",
      }}
    >
      <span className="font-serif font-bold text-2xl" style={{ color: "#A6157A", opacity: 0.55 }}>
        {initials}
      </span>
      <Sparkles
        className="absolute"
        style={{ color: "#C9972E", opacity: 0.35, width: 16, height: 16, top: 8, right: 10 }}
      />
    </div>
  );
}
