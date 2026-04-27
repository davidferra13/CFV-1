-- Client memory: structured recall of client preferences, allergies, patterns,
-- and behavioral observations extracted from events, messages, and manual entry.

CREATE TABLE IF NOT EXISTS client_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  key TEXT NOT NULL,
  value JSONB NOT NULL,

  confidence INT NOT NULL DEFAULT 100 CHECK (confidence >= 0 AND confidence <= 100),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (
    source IN ('manual', 'event_parse', 'message_parse', 'completion_extract', 'menu_parse')
  ),
  pinned BOOLEAN NOT NULL DEFAULT false,

  source_event_id UUID REFERENCES events(id) ON DELETE SET NULL,

  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Primary lookup: all memories for a client within a tenant
CREATE INDEX IF NOT EXISTS idx_client_memory_tenant_client
  ON client_memory(tenant_id, client_id);

-- Unique constraint: one key per client per tenant (upsert-friendly)
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_memory_tenant_client_key
  ON client_memory(tenant_id, client_id, key);

-- Find stale memories for decay job
CREATE INDEX IF NOT EXISTS idx_client_memory_decay
  ON client_memory(last_seen_at)
  WHERE pinned = false AND confidence > 0;
