-- Surface usage events for adaptive app surface
-- Tracks page visits, actions, pins, and dismissals

CREATE TABLE IF NOT EXISTS surface_usage_events (
  id SERIAL PRIMARY KEY,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  route_path TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('visit', 'action', 'pin', 'unpin', 'dismiss', 'restore', 'search_hit')),
  metadata JSONB DEFAULT '{}',
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying by chef + route (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_surface_usage_chef_route ON surface_usage_events(chef_id, route_path);
-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_surface_usage_created ON surface_usage_events(created_at);
-- Index for event type filtering
CREATE INDEX IF NOT EXISTS idx_surface_usage_type ON surface_usage_events(chef_id, event_type);

-- Pinned surfaces table (chef's manual surface preferences)
CREATE TABLE IF NOT EXISTS chef_pinned_surfaces (
  id SERIAL PRIMARY KEY,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  route_path TEXT NOT NULL,
  label TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(chef_id, route_path)
);

CREATE INDEX IF NOT EXISTS idx_pinned_surfaces_chef ON chef_pinned_surfaces(chef_id);
