"use client";

import { useCart } from "@/components/CartProvider";

export function CartCountBadge() {
  const { count } = useCart();
  if (count === 0) return null;
  return (
    <span
      className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
      style={{ backgroundColor: "#E11D2E" }}
    >
      {count}
    </span>
  );
}
