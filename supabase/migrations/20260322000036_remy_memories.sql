-- Remy Memories: persistent, per-tenant memory for the AI companion.
-- Extracted from conversations — allows Remy to learn and adapt over time.
-- Memories are categorized, scored by relevance, and decayed when stale.

CREATE TABLE IF NOT EXISTS remy_memories (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- What category this memory belongs to
  category           TEXT NOT NULL,
  -- Categories:
  --   chef_preference     — "Chef prefers rustic plating over fine dining"
  --   client_insight      — "Mrs. Chen hates cilantro and always tips 25%"
  --   business_rule       — "Never book two events on the same day"
  --   communication_style — "Chef uses casual tone with returning clients"
  --   culinary_note       — "Chef's signature dish is braised short ribs"
  --   scheduling_pattern  — "Chef prefers shopping the day before"
  --   pricing_pattern     — "Chef targets 60% margin on all events"
  --   workflow_preference — "Chef always sends a thank-you within 48 hours"

  -- The memory itself: a concise, factual statement
  content            TEXT NOT NULL,

  -- Optional: which entity this memory relates to
  related_client_id  UUID REFERENCES clients(id) ON DELETE SET NULL,
  related_event_id   UUID REFERENCES events(id) ON DELETE SET NULL,

  -- Relevance scoring
  importance         SMALLINT NOT NULL DEFAULT 5,  -- 1-10 scale, 10 = critical
  access_count       INTEGER NOT NULL DEFAULT 1,   -- how many times loaded into context
  last_accessed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Source tracking
  source_artifact_id UUID REFERENCES remy_artifacts(id) ON DELETE SET NULL,
  source_message     TEXT,  -- the user message that generated this memory

  -- Deduplication: hash of normalized content to prevent exact duplicates
  content_hash       TEXT NOT NULL,

  -- Lifecycle
  is_active          BOOLEAN NOT NULL DEFAULT true,  -- false = soft-deleted / decayed
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Primary query: load memories for this tenant, ordered by relevance
CREATE INDEX idx_remy_memories_tenant_active_importance
  ON remy_memories(tenant_id, is_active, importance DESC, last_accessed_at DESC)
  WHERE is_active = true;
-- Category-based filtering
CREATE INDEX idx_remy_memories_tenant_category
  ON remy_memories(tenant_id, category, importance DESC)
  WHERE is_active = true;
-- Client-specific memories
CREATE INDEX idx_remy_memories_client
  ON remy_memories(tenant_id, related_client_id, importance DESC)
  WHERE related_client_id IS NOT NULL AND is_active = true;
-- Deduplication lookup
CREATE UNIQUE INDEX idx_remy_memories_dedup
  ON remy_memories(tenant_id, content_hash)
  WHERE is_active = true;
-- RLS
ALTER TABLE remy_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY remy_memories_select ON remy_memories
  FOR SELECT USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
CREATE POLICY remy_memories_insert ON remy_memories
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
CREATE POLICY remy_memories_update ON remy_memories
  FOR UPDATE USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- No hard-delete policy — memories are soft-deleted via is_active = false

-- Auto-update updated_at
CREATE TRIGGER set_remy_memories_updated_at
  BEFORE UPDATE ON remy_memories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
