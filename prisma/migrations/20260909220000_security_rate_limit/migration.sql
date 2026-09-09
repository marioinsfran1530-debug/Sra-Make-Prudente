CREATE TABLE IF NOT EXISTS public."ApiRateLimit" (
  "bucket" text NOT NULL,
  "key" text NOT NULL,
  "windowStart" timestamptz NOT NULL,
  "count" integer NOT NULL DEFAULT 0,
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "ApiRateLimit_pkey" PRIMARY KEY ("bucket", "key", "windowStart")
);

CREATE INDEX IF NOT EXISTS "ApiRateLimit_updatedAt_idx" ON public."ApiRateLimit" ("updatedAt");

ALTER TABLE public."ApiRateLimit" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."ApiRateLimit" FROM anon, authenticated;
GRANT ALL ON TABLE public."ApiRateLimit" TO service_role;
