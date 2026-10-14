ALTER TABLE "PushSubscription"
  ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "adminId" TEXT;

CREATE INDEX "PushSubscription_isAdmin_idx" ON "PushSubscription" ("isAdmin");
