import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizeCrmPhone } from "@/lib/crm-order-sync";

export const dynamic = "force-dynamic";

export default async function LegacyCrmCustomerByPhonePage({ params }: { params: Promise<{ phone: string }> }) {
  const { phone } = await params;
  const raw = decodeURIComponent(phone);
  const normalized = normalizeCrmPhone(raw);
  if (!normalized) notFound();

  let customer = await prisma.customer.findUnique({
    where: { phone: normalized },
    select: { id: true },
  });

  if (!customer) {
    const digits = raw.replace(/\D/g, "");
    const candidates = Array.from(new Set([raw, digits, digits.startsWith("55") ? digits.slice(2) : `55${digits}`])).filter(Boolean);
    customer = await prisma.customer.findFirst({
      where: { phone: { in: candidates } },
      select: { id: true },
    });
  }

  if (!customer) notFound();
  redirect(`/admin/crm/cliente/${encodeURIComponent(customer.id)}`);
}
