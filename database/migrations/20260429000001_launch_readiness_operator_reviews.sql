CREATE TABLE IF NOT EXISTS "launch_readiness_operator_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "check_key" text NOT NULL,
  "decision" text NOT NULL,
  "reviewer_user_id" uuid,
  "reviewed_at" timestamptz DEFAULT now() NOT NULL,
  "note" text,
  "evidence_url" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "launch_readiness_operator_reviews_check_key_check"
    CHECK ("check_key" = ANY (ARRAY[
      'real_chef_two_weeks',
      'public_booking_test',
      'operator_survey',
      'operator_survey_signal',
      'onboarding_test',
      'acquisition_attribution'
    ]::text[])),
  CONSTRAINT "launch_readiness_operator_reviews_decision_check"
    CHECK ("decision" = ANY (ARRAY['verified', 'rejected']::text[])),
  CONSTRAINT "launch_readiness_operator_reviews_note_check"
    CHECK ("note" IS NULL OR char_length("note") <= 2000),
  CONSTRAINT "launch_readiness_operator_reviews_evidence_url_check"
    CHECK ("evidence_url" IS NULL OR char_length("evidence_url") <= 1000)
);

CREATE INDEX IF NOT EXISTS "idx_launch_readiness_reviews_check_reviewed"
  ON "launch_readiness_operator_reviews" ("check_key", "reviewed_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_launch_readiness_reviews_decision_reviewed"
  ON "launch_readiness_operator_reviews" ("decision", "reviewed_at" DESC);
