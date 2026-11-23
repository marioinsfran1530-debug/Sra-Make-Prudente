"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { BLACK_FRIDAY_PATH } from "@/lib/black-friday";
import {
  CountdownDisplay,
  useBlackFridayMsLeft,
} from "@/components/BlackFridayCountdown";

export function BlackFridayBanner({ endsAt }: { endsAt: string }) {
  const pathname = usePathname();
  const msLeft = useBlackFridayMsLeft(endsAt);

  // Na própria página de ofertas o contador já aparece no topo, e no checkout
  // nada deve tirar o cliente do pedido.
  if (pathname === BLACK_FRIDAY_PATH || pathname.startsWith("/checkout")) {
    return null;
  }

  // O servidor só renderiza o banner enquanto a campanha está ativa; este
  // retorno cobre quem deixou a página aberta até o prazo acabar.
  if (msLeft !== null && msLeft <= 0) return null;

  return (
    <aside
      aria-label="Campanha Black Friday"
      className="text-white"
      style={{
        background:
          "linear-gradient(90deg, #131B33 0%, #4A1250 50%, #131B33 100%)",
      }}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-2.5">
        <p className="text-center text-[11px] font-extrabold uppercase tracking-[0.14em] sm:text-xs">
          <span style={{ color: "#C9972E" }}>Black Friday</span>
          <span className="text-white/90"> Sra Make · até domingo</span>
        </p>

        <CountdownDisplay msLeft={msLeft} />

        <Link
          href={BLACK_FRIDAY_PATH}
          onClick={() =>
            trackEvent("navigation_click", {
              context: "black_friday_banner",
              destination: BLACK_FRIDAY_PATH,
            })
          }
          className="rounded-full px-4 py-1.5 text-[11px] font-extrabold transition hover:brightness-110 sm:text-xs"
          style={{ backgroundColor: "#C9972E", color: "#131B33" }}
        >
          Ver ofertas
        </Link>
      </div>
    </aside>
  );
}
