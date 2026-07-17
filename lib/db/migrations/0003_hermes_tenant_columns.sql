ALTER TABLE "hermes_heartbeats" ADD COLUMN IF NOT EXISTS "tenant_id" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "hermes_actions" ADD COLUMN IF NOT EXISTS "tenant_id" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "hermes_feedback" ADD COLUMN IF NOT EXISTS "tenant_id" text NOT NULL DEFAULT '';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hermes_heartbeats_tenant_id_idx" ON "hermes_heartbeats" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hermes_actions_tenant_id_idx" ON "hermes_actions" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hermes_feedback_tenant_id_idx" ON "hermes_feedback" ("tenant_id");
