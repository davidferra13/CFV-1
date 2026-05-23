-- Chef Operating Loop External Memory
-- Stores chef decisions, preferences, patterns, and observations
-- for AI-assisted contextual recall across sessions.

CREATE TABLE IF NOT EXISTS chef_operating_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('decision', 'preference', 'pattern', 'observation')),
  context TEXT,
  content TEXT NOT NULL,
  relevance_score NUMERIC DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Tenant-scoped lookups
CREATE INDEX idx_chef_operating_memories_tenant ON chef_operating_memories (tenant_id);

-- Type filtering within tenant
CREATE INDEX idx_chef_operating_memories_tenant_type ON chef_operating_memories (tenant_id, memory_type);

-- Full-text search on context + content for recall queries
CREATE INDEX idx_chef_operating_memories_search ON chef_operating_memories
  USING GIN (to_tsvector('english', coalesce(context, '') || ' ' || content));
