-- Remy per-tenant daily usage counter, for tier-based AI rate limiting.
-- Relocated from lib/db/migrations/0004_remy_usage.sql (abandoned drizzle stub dir).
-- Required by app/api/remy/stream/route.ts:131,143 — without this table the ported
-- Remy tier gate throws on every request.
--
-- ADDITIVE ONLY. New table + index. No drops, no type changes, no data loss. Idempotent.

CREATE TABLE IF NOT EXISTS "remy_usage" (
  "tenant_id" text NOT NULL,
  "usage_date" date NOT NULL,
  "query_count" integer DEFAULT 0 NOT NULL,
  PRIMARY KEY ("tenant_id", "usage_date")
);

CREATE INDEX IF NOT EXISTS "remy_usage_tenant_date_idx" ON "remy_usage" ("tenant_id", "usage_date");
