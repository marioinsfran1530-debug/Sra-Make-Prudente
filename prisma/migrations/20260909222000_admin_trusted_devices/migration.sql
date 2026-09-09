CREATE TABLE IF NOT EXISTS "AdminTrustedDevice" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "AdminTrustedDevice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminTrustedDevice_adminId_fkey"
    FOREIGN KEY ("adminId") REFERENCES "AdminProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminTrustedDevice_tokenHash_key"
  ON "AdminTrustedDevice"("tokenHash");

CREATE INDEX IF NOT EXISTS "AdminTrustedDevice_adminId_revokedAt_expiresAt_idx"
  ON "AdminTrustedDevice"("adminId", "revokedAt", "expiresAt");

ALTER TABLE "AdminTrustedDevice" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AdminTrustedDevice" FROM anon, authenticated;
GRANT SELECT ON TABLE "AdminTrustedDevice" TO service_role;
