"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

type ProductViewTrackerProps = {
  productId: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  sku?: string | null;
  price?: number | null;
};

export function ProductViewTracker({
  productId,
  name,
  brand,
  category,
  sku,
  price,
}: ProductViewTrackerProps) {
  useEffect(() => {
    trackEvent("product_view", {
      productId,
      name,
      brand,
      category,
      sku,
      price,
      qty: 1,
    });
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
