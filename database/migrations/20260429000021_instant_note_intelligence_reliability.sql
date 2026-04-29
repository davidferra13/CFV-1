-- Instant Note Intelligence Reliability Layer
-- Adds background queue linkage, trace graph rows, action dedupe metadata,
-- and durable learning rules for correction feedback.
-- ADDITIVE ONLY. No DROP TABLE, no DROP COLUMN, no DELETE, no TRUNCATE.

ALTER TABLE chef_quick_notes
  ADD COLUMN IF NOT EXISTS capture_source TEXT NOT NULL DEFAULT 'typed'
    CHECK (capture_source IN ('typed', 'pasted', 'voice', 'photo', 'system')),
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'unprocessed'
    CHECK (processing_status IN ('unprocessed', 'queued', 'processing', 'processed', 'needs_review', 'failed'));

ALTER TABLE chef_note_interpretations
  ADD COLUMN IF NOT EXISTS ai_task_id UUID REFERENCES ai_task_queue(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS processor_mode TEXT NOT NULL DEFAULT 'inline'
    CHECK (processor_mode IN ('inline', 'queued', 'inline_fallback', 'worker')),
  ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_reason TEXT,
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

ALTER TABLE chef_note_components
  ADD COLUMN IF NOT EXISTS route_key TEXT,
  ADD COLUMN IF NOT EXISTS route_confidence_band TEXT
    CHECK (route_confidence_band IN ('high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS route_error TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unassigned_guard TEXT;

ALTER TABLE chef_note_actions
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT,
  ADD COLUMN IF NOT EXISTS source_action_signature TEXT,
  ADD COLUMN IF NOT EXISTS calendar_entry_id UUID REFERENCES chef_calendar_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_chef_quick_notes_processing
  ON chef_quick_notes(chef_id, processing_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chef_note_interpretations_ai_task
  ON chef_note_interpretations(ai_task_id) WHERE ai_task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chef_note_interpretations_dedupe
  ON chef_note_interpretations(chef_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chef_note_actions_dedupe
  ON chef_note_actions(chef_id, dedupe_key, status, created_at DESC)
  WHERE dedupe_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS chef_note_trace_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  quick_note_id UUID NOT NULL REFERENCES chef_quick_notes(id) ON DELETE CASCADE,
  interpretation_id UUID REFERENCES chef_note_interpretations(id) ON DELETE CASCADE,
  component_id UUID REFERENCES chef_note_components(id) ON DELETE SET NULL,
  action_id UUID REFERENCES chef_note_actions(id) ON DELETE SET NULL,
  link_kind TEXT NOT NULL
    CHECK (link_kind IN ('raw_to_interpretation', 'interpretation_to_component', 'component_to_route', 'action_to_task', 'action_to_calendar', 'action_to_review', 'correction_to_learning')),
  derived_type TEXT NOT NULL,
  derived_ref_id UUID,
  route_layer TEXT,
  confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chef_note_trace_links_note
  ON chef_note_trace_links(quick_note_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chef_note_trace_links_chef
  ON chef_note_trace_links(chef_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chef_note_trace_links_derived
  ON chef_note_trace_links(chef_id, derived_type, derived_ref_id)
  WHERE derived_ref_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS chef_note_learning_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  correction_id UUID REFERENCES chef_note_corrections(id) ON DELETE SET NULL,
  rule_type TEXT NOT NULL
    CHECK (rule_type IN ('classification', 'routing', 'action', 'time_window', 'confidence', 'other')),
  pattern TEXT NOT NULL,
  instruction TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 100),
  last_applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chef_note_learning_rules_chef
  ON chef_note_learning_rules(chef_id, rule_type, weight DESC, created_at DESC);

ALTER TABLE chef_note_trace_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_note_learning_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY chef_note_trace_links_chef_all ON chef_note_trace_links
    FOR ALL
    USING (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ))
    WITH CHECK (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY chef_note_learning_rules_chef_all ON chef_note_learning_rules
    FOR ALL
    USING (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ))
    WITH CHECK (chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'chef'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
