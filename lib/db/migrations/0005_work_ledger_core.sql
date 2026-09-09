CREATE TABLE IF NOT EXISTS "work_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "chefs"("id") ON DELETE CASCADE,
  "source_type" text NOT NULL,
  "source_account" text,
  "source_record_id" text NOT NULL,
  "source_hash" text NOT NULL,
  "source_created_at" timestamptz,
  "interval_start" timestamptz,
  "interval_end" timestamptz,
  "actor_type" text NOT NULL,
  "actor_id" text,
  "event_id" uuid REFERENCES "events"("id") ON DELETE SET NULL,
  "client_id" uuid REFERENCES "clients"("id") ON DELETE SET NULL,
  "project_key" text,
  "activity_hint" text,
  "signal_type" text NOT NULL,
  "signal_summary" text NOT NULL,
  "minimal_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "privacy_class" text NOT NULL,
  "ingested_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "work_evidence_interval_check" CHECK ("interval_end" IS NULL OR "interval_start" IS NULL OR "interval_end" >= "interval_start"),
  CONSTRAINT "work_evidence_actor_check" CHECK ("actor_type" IN ('david_active','david_supervisory','ai_agent_runtime','staff','system')),
  CONSTRAINT "work_evidence_source_unique" UNIQUE NULLS NOT DISTINCT
    ("tenant_id", "source_type", "source_account", "source_record_id")
);
CREATE INDEX "work_evidence_tenant_time_idx" ON "work_evidence" ("tenant_id", "source_created_at");
CREATE INDEX "work_evidence_event_idx" ON "work_evidence" ("tenant_id", "event_id");

CREATE TABLE IF NOT EXISTS "work_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "chefs"("id") ON DELETE CASCADE,
  "actor_type" text NOT NULL,
  "actor_id" text,
  "activity_type" text NOT NULL,
  "event_id" uuid REFERENCES "events"("id") ON DELETE SET NULL,
  "client_id" uuid REFERENCES "clients"("id") ON DELETE SET NULL,
  "project_key" text,
  "started_at" timestamptz,
  "ended_at" timestamptz,
  "duration_minutes" integer,
  "duration_kind" text NOT NULL,
  "status" text NOT NULL,
  "confidence_tier" text NOT NULL,
  "creation_mode" text NOT NULL,
  "boundary_gap" text,
  "summary" text NOT NULL,
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "superseded_by" uuid REFERENCES "work_sessions"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "work_sessions_duration_check" CHECK ("duration_minutes" IS NULL OR "duration_minutes" >= 0),
  CONSTRAINT "work_sessions_interval_check" CHECK ("ended_at" IS NULL OR "started_at" IS NULL OR "ended_at" >= "started_at"),
  CONSTRAINT "work_sessions_actor_check" CHECK ("actor_type" IN ('david_active','david_supervisory','ai_agent_runtime','staff','system')),
  CONSTRAINT "work_sessions_status_check" CHECK ("status" IN ('proposed','review_required','approved','rejected','superseded')),
  CONSTRAINT "work_sessions_duration_kind_check" CHECK ("duration_kind" IN ('exact','observed_window','inferred','unknown')),
  CONSTRAINT "work_sessions_approval_boundaries_check" CHECK (
    "status" <> 'approved' OR "duration_minutes" IS NULL OR
    (("started_at" IS NOT NULL AND "ended_at" IS NOT NULL) OR "creation_mode" = 'manual_log')
  )
);
CREATE INDEX "work_sessions_tenant_status_time_idx" ON "work_sessions" ("tenant_id", "status", "started_at");
CREATE INDEX "work_sessions_event_idx" ON "work_sessions" ("tenant_id", "event_id");
CREATE UNIQUE INDEX "work_sessions_one_open_manual_clock" ON "work_sessions" ("tenant_id")
  WHERE "ended_at" IS NULL AND "creation_mode" = 'manual_clock' AND "status" <> 'rejected';

CREATE TABLE IF NOT EXISTS "work_session_evidence" (
  "session_id" uuid NOT NULL REFERENCES "work_sessions"("id") ON DELETE CASCADE,
  "evidence_id" uuid NOT NULL REFERENCES "work_evidence"("id") ON DELETE RESTRICT,
  "evidence_role" text DEFAULT 'supporting' NOT NULL,
  "weight" numeric(4,3) DEFAULT 1.000 NOT NULL,
  PRIMARY KEY ("session_id", "evidence_id")
);

CREATE TABLE IF NOT EXISTS "work_session_corrections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "chefs"("id") ON DELETE CASCADE,
  "session_id" uuid NOT NULL REFERENCES "work_sessions"("id") ON DELETE CASCADE,
  "previous_values" jsonb NOT NULL,
  "replacement_values" jsonb NOT NULL,
  "correction_reason" text NOT NULL,
  "reviewer_id" uuid,
  "rule_id" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "work_corrections_tenant_session_idx" ON "work_session_corrections" ("tenant_id", "session_id");

CREATE TABLE IF NOT EXISTS "work_inference_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "chefs"("id") ON DELETE CASCADE,
  "rule_key" text NOT NULL,
  "version" integer NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "evidence_threshold" integer DEFAULT 1 NOT NULL,
  "accepted_count" integer DEFAULT 0 NOT NULL,
  "edited_count" integer DEFAULT 0 NOT NULL,
  "rejected_count" integer DEFAULT 0 NOT NULL,
  "false_positive_count" integer DEFAULT 0 NOT NULL,
  "false_negative_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  UNIQUE ("tenant_id", "rule_key", "version")
);
CREATE TABLE IF NOT EXISTS "work_capture_devices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "chefs"("id") ON DELETE CASCADE,
  "device_key" text NOT NULL,
  "device_type" text NOT NULL,
  "label" text NOT NULL,
  "last_successful_sync" timestamptz,
  "last_evidence_at" timestamptz,
  "paused" boolean DEFAULT false NOT NULL,
  "privacy_policy_version" text NOT NULL,
  "coverage_gap_reason" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  UNIQUE ("tenant_id", "device_key")
);

ALTER TABLE "work_evidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_session_evidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_session_corrections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_inference_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_capture_devices" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "work_evidence_tenant_select" ON "work_evidence" FOR SELECT
  USING (tenant_id = get_current_tenant_id());
CREATE POLICY "work_evidence_tenant_insert" ON "work_evidence" FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "work_sessions_tenant_all" ON "work_sessions" FOR ALL
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "work_session_evidence_tenant_select" ON "work_session_evidence" FOR SELECT
  USING (EXISTS (SELECT 1 FROM work_sessions s WHERE s.id = session_id AND s.tenant_id = get_current_tenant_id()));
CREATE POLICY "work_session_evidence_tenant_insert" ON "work_session_evidence" FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM work_sessions s WHERE s.id = session_id AND s.tenant_id = get_current_tenant_id())
    AND EXISTS (SELECT 1 FROM work_evidence e WHERE e.id = evidence_id AND e.tenant_id = get_current_tenant_id()));
CREATE POLICY "work_session_evidence_tenant_delete" ON "work_session_evidence" FOR DELETE
  USING (EXISTS (SELECT 1 FROM work_sessions s WHERE s.id = session_id AND s.tenant_id = get_current_tenant_id()));
CREATE POLICY "work_corrections_tenant_select" ON "work_session_corrections" FOR SELECT
  USING (tenant_id = get_current_tenant_id());
CREATE POLICY "work_corrections_tenant_insert" ON "work_session_corrections" FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "work_inference_rules_tenant_all" ON "work_inference_rules" FOR ALL
  USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "work_capture_devices_tenant_all" ON "work_capture_devices" FOR ALL
  USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id());
CREATE OR REPLACE FUNCTION prevent_work_ledger_fact_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'work ledger evidence and correction history are append-only';
END;
$$;

CREATE TRIGGER "work_evidence_prevent_update"
  BEFORE UPDATE ON "work_evidence"
  FOR EACH ROW EXECUTE FUNCTION prevent_work_ledger_fact_mutation();
CREATE TRIGGER "work_evidence_prevent_delete"
  BEFORE DELETE ON "work_evidence"
  FOR EACH ROW EXECUTE FUNCTION prevent_work_ledger_fact_mutation();
CREATE TRIGGER "work_corrections_prevent_update"
  BEFORE UPDATE ON "work_session_corrections"
  FOR EACH ROW EXECUTE FUNCTION prevent_work_ledger_fact_mutation();
CREATE TRIGGER "work_corrections_prevent_delete"
  BEFORE DELETE ON "work_session_corrections"
  FOR EACH ROW EXECUTE FUNCTION prevent_work_ledger_fact_mutation();
