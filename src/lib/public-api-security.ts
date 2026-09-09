import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

function hashKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function getClientIp(request: NextRequest) {
  const forwarded =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for") ||
    "unknown";

  return forwarded.split(",")[0]?.trim().slice(0, 120) || "unknown";
}

export function isTrustedSameSiteRequest(request: NextRequest) {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "same-site") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin === request.nextUrl.origin;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === request.nextUrl.origin;
    } catch {
      return false;
    }
  }

  return false;
}

export async function consumeRateLimit(input: {
  bucket: string;
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = input.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const key = hashKey(input.key);

  const row = await prisma.apiRateLimit.upsert({
    where: {
      bucket_key_windowStart: {
        bucket: input.bucket,
        key,
        windowStart,
      },
    },
    create: {
      bucket: input.bucket,
      key,
      windowStart,
      count: 1,
    },
    update: {
      count: { increment: 1 },
    },
    select: { count: true },
  });

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowStart.getTime() + windowMs - now) / 1000)
  );

  if (Math.random() < 0.01) {
    void prisma.apiRateLimit
      .deleteMany({
        where: { updatedAt: { lt: new Date(now - 3 * 24 * 60 * 60 * 1000) } },
      })
      .catch(() => undefined);
  }

  return {
    allowed: row.count <= input.limit,
    retryAfterSeconds,
  };
}
