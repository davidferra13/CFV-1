CREATE TABLE IF NOT EXISTS "remy_usage" (
  "tenant_id" text NOT NULL,
  "usage_date" date NOT NULL,
  "query_count" integer DEFAULT 0 NOT NULL,
  PRIMARY KEY ("tenant_id", "usage_date")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "remy_usage_tenant_date_idx" ON "remy_usage" ("tenant_id", "usage_date");
