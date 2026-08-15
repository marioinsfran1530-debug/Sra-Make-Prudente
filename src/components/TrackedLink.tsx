"use client";

import { trackEvent } from "@/lib/analytics";

export function WhatsAppLink({
  href,
  context,
  className,
  style,
  children,
}: {
  href: string;
  context: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent("whatsapp_click", { context })}
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}

export function LocationLink({
  href,
  className,
  style,
  children,
}: {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent("store_location_click", {})}
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}
