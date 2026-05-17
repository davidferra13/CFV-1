-- ============================================
-- CIRCLE COLLABORATORS
-- ============================================
-- Enables multi-chef collaboration on Dinner Circles.
-- A circle owner can invite other chefs/staff to participate
-- in the circle with defined roles.
--
-- ADDITIVE ONLY. No drops, no modifications to existing tables.
-- ============================================

CREATE TABLE IF NOT EXISTS circle_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The dinner circle (hub_groups)
  circle_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,

  -- The user being invited (auth.users id)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role within the circle
  -- co_host | sous_chef | server | observer
  role TEXT NOT NULL DEFAULT 'sous_chef'
    CHECK (role IN ('co_host', 'sous_chef', 'server', 'observer')),

  -- Who sent the invitation (auth.users id)
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  -- pending | active | removed
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'removed')),

  -- One collaborator row per user per circle
  CONSTRAINT unique_circle_collaborator UNIQUE (circle_id, user_id)
);

COMMENT ON TABLE circle_collaborators IS
  'Multi-chef collaboration on Dinner Circles. Collaborators gain visibility into circle guests and communications based on role.';

-- Indexes
CREATE INDEX idx_circle_collaborators_circle ON circle_collaborators(circle_id);
CREATE INDEX idx_circle_collaborators_user ON circle_collaborators(user_id);
CREATE INDEX idx_circle_collaborators_status ON circle_collaborators(status);

-- Partial: active collaborators (most common query)
CREATE INDEX idx_circle_collaborators_active
  ON circle_collaborators(user_id) WHERE status = 'active';

-- Partial: pending invitations (inbox badge)
CREATE INDEX idx_circle_collaborators_pending
  ON circle_collaborators(user_id) WHERE status = 'pending';
