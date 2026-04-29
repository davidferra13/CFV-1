ALTER TABLE "launch_readiness_operator_reviews"
  ADD COLUMN IF NOT EXISTS "check_label" text,
  ADD COLUMN IF NOT EXISTS "check_status_at_review" text,
  ADD COLUMN IF NOT EXISTS "check_next_step" text,
  ADD COLUMN IF NOT EXISTS "evidence_snapshot" jsonb,
  ADD COLUMN IF NOT EXISTS "evidence_fingerprint" text,
  ADD COLUMN IF NOT EXISTS "evidence_generated_at" timestamptz;

CREATE TABLE IF NOT EXISTS "launch_readiness_signoffs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "signoff_user_id" uuid NOT NULL,
  "signed_at" timestamptz DEFAULT now() NOT NULL,
  "generated_at" timestamptz NOT NULL,
  "verified_checks" integer NOT NULL,
  "total_checks" integer NOT NULL,
  "decision_packet" jsonb NOT NULL,
  "packet_filename" text NOT NULL,
  "packet_content_type" text NOT NULL,
  "packet_sha256" text NOT NULL,
  "note" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "launch_readiness_signoffs_all_verified_check"
    CHECK ("verified_checks" = "total_checks"),
  CONSTRAINT "launch_readiness_signoffs_total_positive_check"
    CHECK ("total_checks" > 0),
  CONSTRAINT "launch_readiness_signoffs_note_check"
    CHECK ("note" IS NULL OR char_length("note") <= 2000)
);

CREATE INDEX IF NOT EXISTS "idx_launch_readiness_signoffs_signed_at"
  ON "launch_readiness_signoffs" ("signed_at" DESC);

CREATE TABLE IF NOT EXISTS "launch_readiness_activity_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_type" text NOT NULL,
  "check_key" text,
  "actor_user_id" uuid,
  "occurred_at" timestamptz DEFAULT now() NOT NULL,
  "message" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "launch_readiness_activity_events_event_type_check"
    CHECK ("event_type" = ANY (ARRAY[
      'review_verified',
      'review_rejected',
      'signoff_created',
      'export_generated'
    ]::text[])),
  CONSTRAINT "launch_readiness_activity_events_message_check"
    CHECK (char_length("message") > 0 AND char_length("message") <= 1000)
);

CREATE INDEX IF NOT EXISTS "idx_launch_readiness_activity_occurred_at"
  ON "launch_readiness_activity_events" ("occurred_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_launch_readiness_activity_check_occurred"
  ON "launch_readiness_activity_events" ("check_key", "occurred_at" DESC);
