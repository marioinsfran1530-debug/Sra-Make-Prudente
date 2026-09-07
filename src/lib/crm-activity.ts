import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export type CrmTagRow = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
};

export type CrmTimelineRow = {
  id: string;
  kind: string;
  channel: string | null;
  direction: string | null;
  body: string | null;
  createdAt: Date;
  leadId: string | null;
  productId: string | null;
  productName: string | null;
  orderId: string | null;
  orderNumber: number | null;
  createdByName: string | null;
};

export function slugifyCrmTag(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function logCrmInteraction(input: {
  customerId: string;
  kind: string;
  leadId?: string | null;
  productId?: string | null;
  orderId?: string | null;
  createdById?: string | null;
  channel?: string | null;
  direction?: string | null;
  body?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const metadata = input.metadata ? JSON.stringify(input.metadata) : null;
  const id = `int_${randomUUID()}`;
  await prisma.$executeRaw`
    INSERT INTO "CrmInteraction"
      ("id", "customerId", "leadId", "productId", "orderId", "createdById", "kind", "channel", "direction", "body", "metadata", "createdAt")
    VALUES
      (${id}, ${input.customerId}, ${input.leadId ?? null}, ${input.productId ?? null}, ${input.orderId ?? null}, ${input.createdById ?? null}, ${input.kind}, ${input.channel ?? null}, ${input.direction ?? null}, ${input.body ?? null}, ${metadata}::jsonb, NOW())
  `;
  return id;
}

export async function listCrmTags() {
  return prisma.$queryRaw<CrmTagRow[]>`
    SELECT "id", "name", "slug", "color"
    FROM "CrmTag"
    WHERE "active" = TRUE
    ORDER BY "name" ASC
  `;
}

export async function listCustomerTags(customerId: string) {
  return prisma.$queryRaw<CrmTagRow[]>`
    SELECT t."id", t."name", t."slug", t."color"
    FROM "CustomerTag" ct
    JOIN "CrmTag" t ON t."id" = ct."tagId"
    WHERE ct."customerId" = ${customerId} AND t."active" = TRUE
    ORDER BY t."name" ASC
  `;
}

export async function listCustomerTimeline(customerId: string, limit = 100) {
  const safeLimit = Math.max(1, Math.min(200, limit));
  return prisma.$queryRaw<CrmTimelineRow[]>`
    SELECT
      i."id", i."kind", i."channel", i."direction", i."body", i."createdAt",
      i."leadId", i."productId", p."name" AS "productName",
      i."orderId", o."number" AS "orderNumber",
      a."name" AS "createdByName"
    FROM "CrmInteraction" i
    LEFT JOIN "Product" p ON p."id" = i."productId"
    LEFT JOIN "Order" o ON o."id" = i."orderId"
    LEFT JOIN "AdminProfile" a ON a."id" = i."createdById"
    WHERE i."customerId" = ${customerId}
    ORDER BY i."createdAt" DESC
    LIMIT ${safeLimit}
  `;
}

export async function ensureCustomerTag(customerId: string, tagSlug: string) {
  await prisma.$executeRaw`
    INSERT INTO "CustomerTag" ("customerId", "tagId", "createdAt")
    SELECT ${customerId}, "id", NOW()
    FROM "CrmTag"
    WHERE "slug" = ${tagSlug} AND "active" = TRUE
    ON CONFLICT ("customerId", "tagId") DO NOTHING
  `;
}
