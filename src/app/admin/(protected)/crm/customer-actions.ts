"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { normalizeCrmPhone, normalizeCrmSource } from "@/lib/crm-order-sync";
import { logCrmInteraction } from "@/lib/crm-activity";

export async function updateCustomerAction(formData: FormData) {
  const { session, error } = await requireAdmin("EDITOR");
  if (error || !session) throw new Error(error || "Não autenticado.");

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const phone = normalizeCrmPhone(String(formData.get("phone") ?? ""));
  const source = normalizeCrmSource(String(formData.get("source") ?? ""), "outro");

  if (!id) throw new Error("Cliente inválido.");
  if (!name) throw new Error("Informe o nome do cliente.");
  if (phone.length < 10 || phone.length > 11) throw new Error("Informe um telefone válido com DDD.");

  const customer = await prisma.customer.findUnique({
    where: { id },
    select: { id: true, name: true, phone: true, source: true },
  });
  if (!customer) throw new Error("Cliente não encontrado.");

  const duplicate = await prisma.customer.findFirst({
    where: { phone, id: { not: id } },
    select: { id: true, name: true },
  });
  if (duplicate) {
    throw new Error(`Esse telefone já pertence a ${duplicate.name}. Revise antes de salvar para evitar duplicidade.`);
  }

  await prisma.customer.update({
    where: { id },
    data: {
      name: name.slice(0, 120),
      phone,
      source,
      updatedAt: new Date(),
    },
  });

  await logCrmInteraction({
    customerId: id,
    createdById: session.id,
    kind: "LEAD_UPDATED",
    channel: source,
    body: "Cadastro do cliente atualizado.",
    metadata: {
      before: { name: customer.name, phone: customer.phone, source: customer.source },
      after: { name, phone, source },
    },
  });

  revalidatePath("/admin/crm");
  revalidatePath("/admin/crm/central");
  revalidatePath(`/admin/crm/cliente/${id}`);
  redirect(`/admin/crm/cliente/${encodeURIComponent(id)}`);
}
