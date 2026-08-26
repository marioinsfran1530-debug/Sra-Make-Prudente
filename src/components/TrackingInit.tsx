"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getOrCreateSessionId, captureAcquisition } from "@/lib/tracking";
import { trackEvent } from "@/lib/analytics";

function navigationContext(anchor: HTMLAnchorElement, destination: string) {
  const inBottomNav = Boolean(anchor.closest('nav[aria-label="Atalhos principais"]'));
  const label = anchor.textContent?.trim().toLowerCase() ?? "";

  if (inBottomNav) {
    if (destination === "/categoria") return "bottom_nav_products";
    if (destination === "/carrinho") return "bottom_nav_cart";
    if (destination === "/loja") return "bottom_nav_store";
    if (destination === "/") return "bottom_nav_home";
    return "bottom_nav";
  }

  if (destination === "/categoria" && label.includes("ver produtos")) {
    return "hero_products";
  }

  if (destination === "/categoria") return "catalog_products";
  if (destination.startsWith("/categoria/")) return "category_link";
  if (destination.startsWith("/produto/")) return "product_link";
  return null;
}

export function TrackingInit() {
  const pathname = usePathname();

  useEffect(() => {
    getOrCreateSessionId();
    captureAcquisition();
  }, []);

  useEffect(() => {
    trackEvent("page_view", { path: pathname });
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.origin);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      const destination = url.pathname;
      const context = navigationContext(anchor, destination);
      if (!context) return;

      const payload: Record<string, unknown> = {
        context,
        destination,
        path: window.location.pathname,
      };

      if (destination.startsWith("/categoria/")) {
        payload.categorySlug = decodeURIComponent(destination.slice("/categoria/".length));
      }

      if (destination.startsWith("/produto/")) {
        payload.productId = decodeURIComponent(destination.slice("/produto/".length));
      }

      trackEvent("navigation_click", payload);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
