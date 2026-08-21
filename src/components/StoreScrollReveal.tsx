"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function StoreScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("main > div, main > section")
    ).filter((element) => element.getBoundingClientRect().top > window.innerHeight * 0.82);

    if (!elements.length) return;

    elements.forEach((element) => {
      element.style.opacity = "0";
      element.style.transform = "translateY(14px)";
      element.style.transition = "opacity 360ms ease, transform 360ms ease";
      element.style.willChange = "opacity, transform";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target as HTMLElement;
          element.style.opacity = "1";
          element.style.transform = "translateY(0)";
          element.style.willChange = "auto";
          observer.unobserve(element);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    elements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      elements.forEach((element) => {
        element.style.opacity = "";
        element.style.transform = "";
        element.style.transition = "";
        element.style.willChange = "";
      });
    };
  }, [pathname]);

  return null;
}
