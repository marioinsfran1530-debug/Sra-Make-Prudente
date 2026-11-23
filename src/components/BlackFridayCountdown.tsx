"use client";

import { useEffect, useState } from "react";
import { blackFridayMsLeft, splitCountdown } from "@/lib/black-friday";

// Começa em null (igual no servidor e no primeiro render do navegador) e passa
// a contar assim que a página monta, sem diferença de hidratação.
export function useBlackFridayMsLeft(endsAt: string): number | null {
  const [msLeft, setMsLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setMsLeft(blackFridayMsLeft(Date.now(), endsAt));
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);

    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [endsAt]);

  return msLeft;
}

export function CountdownDisplay({
  msLeft,
  className = "",
}: {
  msLeft: number | null;
  className?: string;
}) {
  const parts = msLeft === null ? null : splitCountdown(msLeft);
  const pad = (value: number) => String(value).padStart(2, "0");

  const units = [
    ...(parts && parts.days > 0
      ? [{ label: "dias", value: String(parts.days) }]
      : []),
    { label: "horas", value: parts ? pad(parts.hours) : "--" },
    { label: "min", value: parts ? pad(parts.minutes) : "--" },
    { label: "seg", value: parts ? pad(parts.seconds) : "--" },
  ];

  return (
    <div
      role="timer"
      aria-label="Tempo restante da Black Friday"
      className={`flex items-center gap-1.5 ${className}`}
    >
      {units.map((unit) => (
        <div
          key={unit.label}
          className="flex min-w-[42px] flex-col items-center rounded-lg bg-white/10 px-1.5 py-1 leading-none"
        >
          <span className="text-sm font-extrabold tabular-nums">
            {unit.value}
          </span>
          <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider text-white/70">
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function BlackFridayCountdown({
  endsAt,
  className,
}: {
  endsAt: string;
  className?: string;
}) {
  const msLeft = useBlackFridayMsLeft(endsAt);
  return <CountdownDisplay msLeft={msLeft} className={className} />;
}
