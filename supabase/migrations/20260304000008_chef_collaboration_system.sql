-- ============================================
-- CHEF COLLABORATION SYSTEM
-- ============================================
-- Enables cross-chef collaboration on events:
--   • event_collaborators — junction table for multi-chef events
--   • recipe_shares — chef-to-chef recipe sharing
--
-- Design principles:
--   • Events retain a single owner (tenant_id unchanged)
--   • Collaborators gain access via event_collaborators (RLS expansion)
--   • Handoff is a role change (primary ↔ observer), not a tenant change
--   • Recipe sharing creates an editable copy — originals are never mutated
--   • Connection gate: only chefs with accepted chef_connections can invite
-- ============================================

-- ─── Event Collaborators ─────────────────────

CREATE TABLE event_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The event being collaborated on
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- The chef being invited/collaborating
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- The chef who sent the invitation (always the event owner or current primary)
  invited_by_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Role determines default capabilities
  -- primary | co_host | sous_chef | observer
  role TEXT NOT NULL DEFAULT 'co_host'
    CHECK (role IN ('primary', 'co_host', 'sous_chef', 'observer')),

  -- pending → accepted | declined | removed
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'removed')),

  -- Fine-grained permission overrides (stored as JSONB, validated in application)
  permissions JSONB NOT NULL DEFAULT '{
    "can_modify_menu": false,
    "can_assign_staff": false,
    "can_view_financials": false,
    "can_communicate_with_client": false,
    "can_close_event": false
  }',

  -- Optional invitation message
  note TEXT,

  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One collaborator row per chef per event
  CONSTRAINT unique_event_collaborator UNIQUE (event_id, chef_id),

  -- No self-collaboration
  CONSTRAINT no_self_collaboration CHECK (chef_id != invited_by_chef_id)
);
COMMENT ON TABLE event_collaborators IS
  'Cross-tenant chef collaboration on events. A chef invited here gains access to the event based on their role and permissions. Events retain their original tenant_id.';
COMMENT ON COLUMN event_collaborators.role IS
  'primary | co_host | sous_chef | observer. Determines default permissions and dashboard visibility.';
COMMENT ON COLUMN event_collaborators.permissions IS
  'JSONB with boolean keys: can_modify_menu, can_assign_staff, can_view_financials, can_communicate_with_client, can_close_event.';
-- ─── Indexes ──────────────────────────────────
CREATE INDEX idx_event_collaborators_event_id ON event_collaborators(event_id);
CREATE INDEX idx_event_collaborators_chef_id ON event_collaborators(chef_id);
CREATE INDEX idx_event_collaborators_invited_by ON event_collaborators(invited_by_chef_id);
CREATE INDEX idx_event_collaborators_status ON event_collaborators(status);
-- Partial index: accepted collaborators (most common query pattern)
CREATE INDEX idx_event_collaborators_accepted
  ON event_collaborators(chef_id) WHERE status = 'accepted';
-- Partial index: pending invitations (inbox / notification badge)
CREATE INDEX idx_event_collaborators_pending
  ON event_collaborators(chef_id) WHERE status = 'pending';
-- ─── Recipe Shares ───────────────────────────

CREATE TABLE recipe_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The recipe being shared
  original_recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,

  -- The chef sharing the recipe
  from_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- The chef receiving the share invitation
  to_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- pending → accepted | declined
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),

  -- Optional note from sharing chef
  note TEXT,

  -- Set when accepted: points to the newly created copy in to_chef's namespace
  created_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,

  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One active share per recipe per recipient
  CONSTRAINT unique_recipe_share UNIQUE (original_recipe_id, to_chef_id),

  -- No self-sharing
  CONSTRAINT no_self_share CHECK (from_chef_id != to_chef_id)
);
COMMENT ON TABLE recipe_shares IS
  'Tracks chef-to-chef recipe sharing. When accepted, a deep copy is created in the receiving chef''s namespace. The original is never modified.';
COMMENT ON COLUMN recipe_shares.created_recipe_id IS
  'UUID of the copy created when the share was accepted. NULL until accepted.';
-- ─── Indexes ──────────────────────────────────
CREATE INDEX idx_recipe_shares_from_chef ON recipe_shares(from_chef_id);
CREATE INDEX idx_recipe_shares_to_chef ON recipe_shares(to_chef_id);
CREATE INDEX idx_recipe_shares_original ON recipe_shares(original_recipe_id);
CREATE INDEX idx_recipe_shares_pending
  ON recipe_shares(to_chef_id) WHERE status = 'pending';
-- ─── RLS Policies — event_collaborators ──────

ALTER TABLE event_collaborators ENABLE ROW LEVEL SECURITY;
-- Event owner can fully manage all collaborators on their events
CREATE POLICY "event_owner_manages_collaborators"
  ON event_collaborators
  FOR ALL
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE tenant_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid())
    )
  );
-- Collaborating chef can read and update their own row (accept/decline)
CREATE POLICY "collaborator_manages_own_row"
  ON event_collaborators
  FOR ALL
  USING (
    chef_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid())
  );
-- ─── RLS Policies — events (expand access to collaborators) ──

-- Collaborating chefs can SELECT events they've accepted
CREATE POLICY "collaborators_can_view_events"
  ON events
  FOR SELECT
  USING (
    id IN (
      SELECT event_id FROM event_collaborators
      WHERE chef_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid())
      AND status = 'accepted'
    )
  );
-- ─── RLS Policies — recipe_shares ────────────

ALTER TABLE recipe_shares ENABLE ROW LEVEL SECURITY;
-- Sending chef can manage their outgoing shares
CREATE POLICY "from_chef_manages_recipe_shares"
  ON recipe_shares
  FOR ALL
  USING (
    from_chef_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid())
  );
-- Receiving chef can read and update (accept/decline) their incoming shares
CREATE POLICY "to_chef_manages_recipe_shares"
  ON recipe_shares
  FOR ALL
  USING (
    to_chef_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid())
  );
-- ─── Network Feature Preferences Extension ────
-- Add event_collaboration preference so chefs can opt out of being invited

ALTER TABLE chef_network_feature_preferences
  ADD COLUMN IF NOT EXISTS event_collaboration BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE chef_network_feature_preferences
  ADD COLUMN IF NOT EXISTS recipe_sharing BOOLEAN NOT NULL DEFAULT TRUE;
COMMENT ON COLUMN chef_network_feature_preferences.event_collaboration IS
  'When false, this chef cannot receive event collaboration invitations.';
COMMENT ON COLUMN chef_network_feature_preferences.recipe_sharing IS
  'When false, this chef cannot receive recipe share requests.';
-- ─── Grants ──────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON event_collaborators TO authenticated;
GRANT SELECT, INSERT, UPDATE ON recipe_shares TO authenticated;
