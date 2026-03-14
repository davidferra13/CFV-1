-- AI Privacy Preferences: per-chef controls for AI features (Remy).
-- Tracks onboarding completion, opt-in status, and data retention preferences.
-- This powers the AI Trust Center in Settings.

CREATE TABLE IF NOT EXISTS ai_preferences (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Core opt-in: AI is OFF until the chef explicitly enables it
  remy_enabled           BOOLEAN NOT NULL DEFAULT false,

  -- Onboarding: chef has been walked through how AI works
  onboarding_completed   BOOLEAN NOT NULL DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,

  -- Data retention: null means keep until manually deleted
  data_retention_days    INTEGER DEFAULT NULL,

  -- Granular feature controls
  allow_memory           BOOLEAN NOT NULL DEFAULT true,  -- Can Remy remember things between conversations?
  allow_suggestions      BOOLEAN NOT NULL DEFAULT true,  -- Can Remy proactively suggest things?
  allow_document_drafts  BOOLEAN NOT NULL DEFAULT true,  -- Can Remy draft emails/docs?

  -- Timestamps
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(tenant_id)
);
-- RLS
ALTER TABLE ai_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_preferences_select ON ai_preferences
  FOR SELECT USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
CREATE POLICY ai_preferences_insert ON ai_preferences
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
CREATE POLICY ai_preferences_update ON ai_preferences
  FOR UPDATE USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- Auto-update updated_at
CREATE TRIGGER set_ai_preferences_updated_at
  BEFORE UPDATE ON ai_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
