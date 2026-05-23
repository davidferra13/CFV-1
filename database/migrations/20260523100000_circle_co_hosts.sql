-- ============================================
-- CIRCLE CO-HOSTS (Multi-Host Collaboration)
-- ============================================
-- Enables multi-host collaboration on Dinner Circles with
-- granular, per-user permission controls stored as JSONB.
-- Complements the existing circle_collaborators table by adding
-- explicit permissions and tenant scoping for co-hosting scenarios.
--
-- ADDITIVE ONLY. No drops, no modifications to existing tables.
-- ============================================

CREATE TABLE IF NOT EXISTS circle_co_hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The dinner circle (hub_groups)
  circle_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,

  -- The user being invited (auth.users id)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role within the circle: co-host, collaborator, viewer
  role TEXT NOT NULL DEFAULT 'collaborator'
    CHECK (role IN ('co-host', 'collaborator', 'viewer')),

  -- Granular permissions as JSONB
  -- Expected keys: canEditEvents, canManageGuests, canPostBroadcasts, canManageIngredients
  permissions JSONB NOT NULL DEFAULT '{
    "canEditEvents": false,
    "canManageGuests": false,
    "canPostBroadcasts": false,
    "canManageIngredients": false
  }'::jsonb,

  -- Who sent the invitation (auth.users id)
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  -- Tenant scoping (chef id who owns the circle)
  tenant_id UUID NOT NULL,

  -- One co-host row per user per circle
  CONSTRAINT unique_circle_co_host UNIQUE (circle_id, user_id)
);

COMMENT ON TABLE circle_co_hosts IS
  'Multi-host collaboration on Dinner Circles with granular JSONB permissions and tenant scoping.';

-- Indexes
CREATE INDEX idx_circle_co_hosts_circle ON circle_co_hosts(circle_id);
CREATE INDEX idx_circle_co_hosts_user ON circle_co_hosts(user_id);
CREATE INDEX idx_circle_co_hosts_tenant ON circle_co_hosts(tenant_id);

-- Partial: accepted co-hosts (most common query)
CREATE INDEX idx_circle_co_hosts_accepted
  ON circle_co_hosts(circle_id) WHERE accepted_at IS NOT NULL;

-- Partial: pending invitations (inbox badge)
CREATE INDEX idx_circle_co_hosts_pending
  ON circle_co_hosts(user_id) WHERE accepted_at IS NULL;
