"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const DRAWER_TITLES = new Set(["Páginas mais visitadas", "Origem do tráfego"]);

export function AnalysisDrawers() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  useEffect(() => {
    if (pathname !== "/admin/analise") return;

    const timer = window.setTimeout(() => {
      const sections = Array.from(document.querySelectorAll<HTMLElement>(".analysis-shell section"));

      for (const section of sections) {
        const heading = section.querySelector("h2");
        if (!heading || !DRAWER_TITLES.has(heading.textContent?.trim() || "")) continue;
        if (section.dataset.drawerReady === "true") continue;

        const header = section.firstElementChild as HTMLElement | null;
        if (!header) continue;

        section.dataset.drawerReady = "true";
        section.dataset.drawerOpen = "false";
        section.classList.add("analysis-drawer");

        const body = Array.from(section.children).slice(1) as HTMLElement[];
        body.forEach((node) => { node.style.display = "none"; });

        const button = document.createElement("button");
        button.type = "button";
        button.className = "analysis-drawer-toggle mt-3 w-full rounded-xl border border-rosa/15 bg-creme px-3 py-2.5 text-[10px] font-extrabold text-rosa-profundo sm:w-auto";
        button.textContent = "Ver detalhes ↓";
        button.setAttribute("aria-expanded", "false");

        button.addEventListener("click", () => {
          const open = section.dataset.drawerOpen !== "true";
          section.dataset.drawerOpen = open ? "true" : "false";
          button.setAttribute("aria-expanded", open ? "true" : "false");
          button.textContent = open ? "Recolher ↑" : "Ver detalhes ↓";
          body.forEach((node) => { node.style.display = open ? "" : "none"; });
        });

        header.insertAdjacentElement("afterend", button);
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.querySelectorAll<HTMLElement>(".analysis-shell .analysis-drawer").forEach((section) => {
        section.querySelector(".analysis-drawer-toggle")?.remove();
        Array.from(section.children).slice(1).forEach((node) => {
          (node as HTMLElement).style.display = "";
        });
        delete section.dataset.drawerReady;
        delete section.dataset.drawerOpen;
        section.classList.remove("analysis-drawer");
      });
    };
  }, [pathname, searchKey]);

  return null;
}
