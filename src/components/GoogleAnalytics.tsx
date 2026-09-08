"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

const GA_MEASUREMENT_ID = "G-60T57RTWD1";
const PRODUCTION_HOSTS = new Set([
  "www.sramakeprudente.com.br",
  "sramakeprudente.com.br",
]);

export function GoogleAnalytics() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const isProductionHost = PRODUCTION_HOSTS.has(window.location.hostname);
    const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

    setEnabled(isProductionHost && !isAdmin);
  }, [pathname]);

  if (!enabled) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
