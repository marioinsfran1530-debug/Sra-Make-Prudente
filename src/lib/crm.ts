export type CrmOrderSnapshot = {
  id: string;
  number: number;
  customerName: string;
  customerPhone: string;
  total: number;
  status: string;
  channel: string;
  origin: string | null;
  utmSource: string | null;
  createdAt: Date;
  items: Array<{
    name: string;
    qty: number;
    unitPrice: number;
  }>;
};

export type CrmCustomer = {
  key: string;
  name: string;
  phone: string;
  whatsappUrl: string;
  firstOrderAt: Date;
  lastOrderAt: Date;
  orderCount: number;
  completedOrderCount: number;
  totalSpent: number;
  averageTicket: number;
  origin: string;
  channels: string[];
  favoriteProducts: Array<{ name: string; qty: number }>;
  daysSinceLastOrder: number;
};

export function normalizePhone(value: string) {
  let digits = (value || "").replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  if (digits.length === 10 && /^[1-9]{2}[6-9]/.test(digits)) {
    digits = `${digits.slice(0, 2)}9${digits.slice(2)}`;
  }
  return digits;
}

export function phoneKey(value: string) {
  const digits = normalizePhone(value);
  return digits || value.trim().toLowerCase();
}

export function whatsappPhone(value: string) {
  const digits = normalizePhone(value);
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length > 11) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function whatsappUrl(value: string, message?: string) {
  const phone = whatsappPhone(value);
  if (!phone) return "#";
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${phone}${text}`;
}

export function formatPhone(value: string) {
  const digits = normalizePhone(value);
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return value;
}

export function buildCustomers(orders: CrmOrderSnapshot[], now = new Date()): CrmCustomer[] {
  const grouped = new Map<string, CrmOrderSnapshot[]>();

  for (const order of orders) {
    const key = phoneKey(order.customerPhone);
    if (!key) continue;
    const list = grouped.get(key) ?? [];
    list.push(order);
    grouped.set(key, list);
  }

  return Array.from(grouped.entries()).map(([key, customerOrders]) => {
    const sorted = [...customerOrders].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const completed = sorted.filter((order) => order.status === "FINALIZADO");
    const revenueOrders = completed.length > 0 ? completed : sorted.filter((order) => order.status !== "CANCELADO");
    const totalSpent = revenueOrders.reduce((sum, order) => sum + order.total, 0);
    const productQty = new Map<string, number>();

    for (const order of revenueOrders) {
      for (const item of order.items) {
        productQty.set(item.name, (productQty.get(item.name) ?? 0) + item.qty);
      }
    }

    const favoriteProducts = Array.from(productQty.entries())
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name))
      .slice(0, 3);

    const latestWithOrigin = [...sorted].reverse().find((order) => order.utmSource || order.origin);
    const origin = latestWithOrigin?.utmSource || latestWithOrigin?.origin || last.channel || "Não informado";
    const daysSinceLastOrder = Math.max(0, Math.floor((now.getTime() - last.createdAt.getTime()) / 86_400_000));
    const name = [...sorted].reverse().find((order) => order.customerName?.trim())?.customerName?.trim() || "Cliente sem nome";

    return {
      key,
      name,
      phone: last.customerPhone,
      whatsappUrl: whatsappUrl(last.customerPhone, `Olá, ${name.split(" ")[0]}! Aqui é da Sra Make Prudente. 💗`),
      firstOrderAt: first.createdAt,
      lastOrderAt: last.createdAt,
      orderCount: sorted.length,
      completedOrderCount: completed.length,
      totalSpent,
      averageTicket: revenueOrders.length ? totalSpent / revenueOrders.length : 0,
      origin,
      channels: Array.from(new Set(sorted.map((order) => order.channel))),
      favoriteProducts,
      daysSinceLastOrder,
    };
  });
}

export function customerTemperature(customer: CrmCustomer) {
  if (customer.daysSinceLastOrder >= 90) return { key: "inactive", label: "+90 dias", tone: "bg-zinc-100 text-zinc-700" };
  if (customer.daysSinceLastOrder >= 60) return { key: "recover", label: "Reativar", tone: "bg-amber-50 text-amber-800" };
  if (customer.daysSinceLastOrder >= 30) return { key: "attention", label: "Atenção", tone: "bg-orange-50 text-orange-800" };
  if (customer.orderCount >= 3 || customer.totalSpent >= 150) return { key: "vip", label: "VIP", tone: "bg-rosa/15 text-rosa-profundo" };
  return { key: "active", label: "Ativo", tone: "bg-emerald-50 text-emerald-700" };
}
