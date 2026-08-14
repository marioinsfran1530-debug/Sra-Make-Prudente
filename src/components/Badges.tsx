import { STOCK_LABEL, type StockStatus } from "@/lib/stock";

export function Badge({
  children,
  tone = "rosa",
}: {
  children: React.ReactNode;
  tone?: "rosa" | "dourado" | "navy";
}) {
  const tones = {
    rosa: { bg: "#E4127B", color: "#fff" },
    dourado: { bg: "#C9972E", color: "#fff" },
    navy: { bg: "#131B33", color: "#fff" },
  };
  const t = tones[tone];
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full inline-block"
      style={{ backgroundColor: t.bg, color: t.color }}
    >
      {children}
    </span>
  );
}

export function StockLabel({ stock }: { stock: StockStatus }) {
  const colors: Record<StockStatus, string> = {
    DISPONIVEL: "#4E9F6E",
    ULTIMAS: "#C9972E",
    INDISPONIVEL: "#E11D2E",
  };
  return (
    <span
      className="text-xs font-semibold"
      style={{ color: colors[stock] }}
    >
      {STOCK_LABEL[stock]}
    </span>
  );
}
