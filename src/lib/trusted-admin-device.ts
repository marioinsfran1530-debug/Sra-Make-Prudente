import "server-only";

import { createHash, randomBytes, randomUUID } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const TRUSTED_ADMIN_DEVICE_COOKIE = "sra_admin_trusted_device";
export const TRUSTED_ADMIN_DEVICE_DAYS = 30;

export type TrustedAdminDevice = {
  id: string;
  adminId: string;
  tokenHash: string;
  label: string;
  userAgent: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
};

export function hashTrustedAdminDeviceToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function detectTrustedDeviceLabel(userAgent: string | null) {
  const ua = userAgent ?? "";

  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Celular Android";
  if (/Windows/i.test(ua)) return "Notebook/PC Windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
  if (/Linux/i.test(ua)) return "Computador Linux";
  return "Dispositivo confiável";
}

export async function getTrustedAdminDeviceFromCookie(adminId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(TRUSTED_ADMIN_DEVICE_COOKIE)?.value;
  if (!token || token.length < 32) return null;

  const tokenHash = hashTrustedAdminDeviceToken(token);
  const now = new Date();

  const rows = await prisma.$queryRaw<TrustedAdminDevice[]>`
    SELECT
      "id",
      "adminId",
      "tokenHash",
      "label",
      "userAgent",
      "createdAt",
      "lastUsedAt",
      "expiresAt",
      "revokedAt"
    FROM "AdminTrustedDevice"
    WHERE "adminId" = ${adminId}
      AND "tokenHash" = ${tokenHash}
      AND "revokedAt" IS NULL
      AND "expiresAt" > ${now}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function hasTrustedAdminDevice(adminId: string) {
  return Boolean(await getTrustedAdminDeviceFromCookie(adminId));
}

export async function createTrustedAdminDevice(args: {
  adminId: string;
  label?: string | null;
  userAgent?: string | null;
}) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashTrustedAdminDeviceToken(token);
  const id = randomUUID();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + TRUSTED_ADMIN_DEVICE_DAYS * 24 * 60 * 60 * 1000
  );
  const label =
    args.label?.trim().slice(0, 80) || detectTrustedDeviceLabel(args.userAgent ?? null);
  const userAgent = args.userAgent?.slice(0, 500) || null;

  await prisma.$executeRaw`
    INSERT INTO "AdminTrustedDevice" (
      "id",
      "adminId",
      "tokenHash",
      "label",
      "userAgent",
      "createdAt",
      "lastUsedAt",
      "expiresAt"
    ) VALUES (
      ${id},
      ${args.adminId},
      ${tokenHash},
      ${label},
      ${userAgent},
      ${now},
      ${now},
      ${expiresAt}
    )
  `;

  return { id, token, label, expiresAt };
}

export async function listTrustedAdminDevices(adminId: string) {
  const now = new Date();

  return prisma.$queryRaw<TrustedAdminDevice[]>`
    SELECT
      "id",
      "adminId",
      "tokenHash",
      "label",
      "userAgent",
      "createdAt",
      "lastUsedAt",
      "expiresAt",
      "revokedAt"
    FROM "AdminTrustedDevice"
    WHERE "adminId" = ${adminId}
      AND "revokedAt" IS NULL
      AND "expiresAt" > ${now}
    ORDER BY "createdAt" DESC
  `;
}

export async function revokeTrustedAdminDevice(adminId: string, deviceId: string) {
  const now = new Date();
  return prisma.$executeRaw`
    UPDATE "AdminTrustedDevice"
    SET "revokedAt" = ${now}
    WHERE "id" = ${deviceId}
      AND "adminId" = ${adminId}
      AND "revokedAt" IS NULL
  `;
}
