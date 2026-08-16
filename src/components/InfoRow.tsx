"use client";

import {
  Clock,
  Facebook,
  Instagram,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";

type InfoRowIcon = "location" | "whatsapp" | "instagram" | "facebook" | "clock";

const icons = {
  location: MapPin,
  whatsapp: MessageCircle,
  instagram: Instagram,
  facebook: Facebook,
  clock: Clock,
};

export function InfoRow({
  icon,
  title,
  text,
  action,
  whatsapp,
  trackKind,
}: {
  icon: InfoRowIcon;
  title: string;
  text: string;
  action?: { label: string; href: string };
  whatsapp?: boolean;
  trackKind?: "whatsapp" | "location";
}) {
  const Icon = icons[icon];

  function handleClick() {
    if (trackKind === "whatsapp") {
      trackEvent("whatsapp_click", { context: "store_page" });
    }

    if (trackKind === "location") {
      trackEvent("store_location_click", {});
    }
  }

  return (
    <div
      className="rounded-2xl p-4 flex items-start gap-3 bg-white"
      style={{ boxShadow: "0 2px 14px rgba(35,20,42,0.06)" }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-creme">
        <Icon size={18} className="text-rosa-profundo" />
      </div>

      <div className="flex-1">
        <p className="text-xs font-bold text-texto">{title}</p>
        <p className="text-xs mt-0.5 text-cinza">{text}</p>

        {action && (
          <a
            href={action.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="inline-block mt-2 text-xs font-bold px-3 py-1.5 rounded-full"
            style={
              whatsapp
                ? { backgroundColor: "#25D366", color: "#fff" }
                : { backgroundColor: "#FFF6FA", color: "#A6157A" }
            }
          >
            {action.label}
          </a>
        )}
      </div>
    </div>
  );
}
