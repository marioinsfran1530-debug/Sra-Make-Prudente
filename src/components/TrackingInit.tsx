"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getOrCreateSessionId, captureAcquisition } from "@/lib/tracking";
import { trackEvent } from "@/lib/analytics";

export function TrackingInit() {
  const pathname = usePathname();

  useEffect(() => {
    getOrCreateSessionId();
    captureAcquisition();
  }, []);

  useEffect(() => {
    trackEvent("page_view", { path: pathname });
  }, [pathname]);

  return null;
}
