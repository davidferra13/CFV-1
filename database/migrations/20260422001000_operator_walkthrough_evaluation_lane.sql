-- Operator walkthrough evaluation lane
-- Adds narrow intake-lane and review-status fields so walkthrough requests
-- can stay in a founder review inbox instead of auto-merging into generic contact handling.

ALTER TABLE contact_submissions
  ADD COLUMN intake_lane TEXT NOT NULL DEFAULT 'general_contact',
  ADD COLUMN operator_evaluation_status TEXT,
  ADD COLUMN source_page TEXT,
  ADD COLUMN source_cta TEXT;

UPDATE contact_submissions
SET
  intake_lane = 'operator_walkthrough',
  operator_evaluation_status = COALESCE(operator_evaluation_status, 'new')
WHERE subject ILIKE 'Operator walkthrough request%'
   OR message ILIKE 'Operator walkthrough request%';

ALTER TABLE contact_submissions
  ADD CONSTRAINT contact_submissions_intake_lane_check
  CHECK (intake_lane = ANY (ARRAY['general_contact'::text, 'operator_walkthrough'::text]));

ALTER TABLE contact_submissions
  ADD CONSTRAINT contact_submissions_operator_evaluation_status_check
  CHECK (
    operator_evaluation_status IS NULL
    OR operator_evaluation_status = ANY (
      ARRAY[
        'new'::text,
        'qualified'::text,
        'replied'::text,
        'scheduled'::text,
        'pilot'::text,
        'not_fit'::text
      ]
    )
  );

CREATE INDEX idx_contact_submissions_operator_eval_status
  ON contact_submissions (operator_evaluation_status, created_at DESC)
  WHERE intake_lane = 'operator_walkthrough';
