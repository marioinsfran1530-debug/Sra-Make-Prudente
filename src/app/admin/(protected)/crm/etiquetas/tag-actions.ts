"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { slugifyCrmTag } from "@/lib/crm-activity";

const ALLOWED_COLORS = new Set(["pink", "rose", "sky", "blue", "violet", "emerald", "amber", "zinc"]);

async function assertEditor() {
  const { session, error } = await requireAdmin("EDITOR");
  if (error || !session) throw new Error(error || "Não autenticado.");
}

function refreshTags() {
  revalidatePath("/admin/crm");
  revalidatePath("/admin/crm/etiquetas");
}

export async function updateCrmTagAction(formData: FormData) {
  await assertEditor();

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const colorRaw = String(formData.get("color") ?? "pink").trim();
  const color = ALLOWED_COLORS.has(colorRaw) ? colorRaw : "pink";
  const slug = slugifyCrmTag(name);

  if (!id || !name || !slug) throw new Error("Informe um nome válido para a etiqueta.");

  const current = await prisma.crmTag.findFirst({
    where: { id, active: true },
    select: { id: true },
  });
  if (!current) throw new Error("Etiqueta não encontrada.");

  const conflict = await prisma.crmTag.findFirst({
    where: { slug, id: { not: id } },
    select: { id: true },
  });
  if (conflict) throw new Error("Já existe uma etiqueta com esse nome.");

  await prisma.crmTag.update({
    where: { id },
    data: { name, slug, color, active: true },
  });

  refreshTags();
  return { ok: true };
}

export async function deleteCrmTagAction(formData: FormData) {
  await assertEditor();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Etiqueta inválida.");

  const tag = await prisma.crmTag.findUnique({
    where: { id },
    select: { id: true, customers: { select: { customerId: true } } },
  });
  if (!tag) throw new Error("Etiqueta não encontrada.");

  const affectedCustomers = tag.customers.length;
  await prisma.crmTag.delete({ where: { id } });

  refreshTags();
  return { ok: true, affectedCustomers };
}
