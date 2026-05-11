-- Event Risk Assessments
-- Stores computed operational risk assessments for events.
-- Purely additive. No existing tables modified.
--
-- The risk engine (lib/costing/operational-risk.ts) computes scores from event/menu/recipe data.
-- This table caches the result for dashboard display, historical comparison, and Remy nudges.
-- Assessments are recomputed whenever the event menu changes; the latest always wins.

CREATE TABLE IF NOT EXISTS event_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Overall scores
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  overall_level TEXT NOT NULL CHECK (overall_level IN ('low', 'moderate', 'high', 'critical')),

  -- Per-dimension breakdown (array of {dimension, score, level, label, reasoning, mitigations})
  factors JSONB NOT NULL DEFAULT '[]',

  -- Top risks (factors with score >= 50, sorted desc)
  top_risks JSONB NOT NULL DEFAULT '[]',

  -- Ordered mitigation priorities
  mitigation_priorities TEXT[] NOT NULL DEFAULT '{}',

  -- How much data was available for the assessment (0-100)
  confidence_in_assessment INTEGER NOT NULL DEFAULT 0
    CHECK (confidence_in_assessment >= 0 AND confidence_in_assessment <= 100),

  -- One assessment per event per tenant (upsert pattern)
  UNIQUE (event_id, tenant_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_risk_assessments_event
  ON event_risk_assessments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_risk_assessments_tenant
  ON event_risk_assessments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_risk_assessments_level
  ON event_risk_assessments(overall_level)
  WHERE overall_level IN ('high', 'critical');

-- RLS: chef can see their own assessments
ALTER TABLE event_risk_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS risk_assessments_chef_all ON event_risk_assessments;
CREATE POLICY risk_assessments_chef_all
  ON event_risk_assessments
  FOR ALL TO authenticated
  USING (
    tenant_id = (
      SELECT ur.entity_id
      FROM public.user_roles ur
      WHERE ur.auth_user_id = auth.uid()
        AND ur.role = 'chef'
      LIMIT 1
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT ur.entity_id
      FROM public.user_roles ur
      WHERE ur.auth_user_id = auth.uid()
        AND ur.role = 'chef'
      LIMIT 1
    )
  );
