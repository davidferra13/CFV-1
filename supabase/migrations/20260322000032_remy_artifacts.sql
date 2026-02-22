-- Remy Artifacts: persistent storage for everything Remy creates
-- Emails, notes, task results, drafts — nothing goes into the abyss.

CREATE TABLE IF NOT EXISTS remy_artifacts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- What kind of artifact this is
  artifact_type TEXT NOT NULL DEFAULT 'note',
  -- CHECK ensures we don't get garbage values
  -- Types: note, email_draft, task_result, conversation, financial_report, client_lookup, event_summary, recipe_suggestion, schedule_check

  -- Human-readable title (auto-generated or user-edited)
  title        TEXT NOT NULL,

  -- The main text content (Remy's response, drafted email, etc.)
  content      TEXT,

  -- Structured data (task results, search results, etc.)
  data         JSONB,

  -- Context: what triggered this artifact
  source_message TEXT,  -- The user's original message that prompted Remy
  source_task_type TEXT, -- e.g. 'email.followup', 'client.search'

  -- Optional references to related entities
  related_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  related_event_id  UUID REFERENCES events(id) ON DELETE SET NULL,

  -- User can pin important artifacts
  pinned       BOOLEAN NOT NULL DEFAULT false,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for listing artifacts by chef (most recent first)
CREATE INDEX idx_remy_artifacts_tenant_created
  ON remy_artifacts(tenant_id, created_at DESC);

-- Index for filtering by type
CREATE INDEX idx_remy_artifacts_tenant_type
  ON remy_artifacts(tenant_id, artifact_type, created_at DESC);

-- Index for pinned artifacts
CREATE INDEX idx_remy_artifacts_pinned
  ON remy_artifacts(tenant_id, pinned, created_at DESC)
  WHERE pinned = true;

-- RLS
ALTER TABLE remy_artifacts ENABLE ROW LEVEL SECURITY;

-- Chef can see their own artifacts
CREATE POLICY remy_artifacts_select ON remy_artifacts
  FOR SELECT USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Chef can insert their own artifacts
CREATE POLICY remy_artifacts_insert ON remy_artifacts
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Chef can update their own artifacts (pin/unpin, edit title)
CREATE POLICY remy_artifacts_update ON remy_artifacts
  FOR UPDATE USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Chef can delete their own artifacts
CREATE POLICY remy_artifacts_delete ON remy_artifacts
  FOR DELETE USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Auto-update updated_at
CREATE TRIGGER set_remy_artifacts_updated_at
  BEFORE UPDATE ON remy_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
