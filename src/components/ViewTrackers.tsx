"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export function ProductViewTracker({ productId, name }: { productId: string; name: string }) {
  useEffect(() => {
    trackEvent("product_view", { productId, name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);
  return null;
}

export function CategoryViewTracker({ categorySlug }: { categorySlug: string }) {
  useEffect(() => {
    trackEvent("category_view", { categorySlug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlug]);
  return null;
}
