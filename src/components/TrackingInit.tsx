"use client";

import { useEffect } from "react";
import { getOrCreateSessionId, captureAcquisition } from "@/lib/tracking";
import { trackEvent } from "@/lib/analytics";

export function TrackingInit() {
  useEffect(() => {
    getOrCreateSessionId();
    captureAcquisition();
    trackEvent("page_view", { path: window.location.pathname });
  }, []);

  return null;
}
