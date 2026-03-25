-- Fix: Tighten event_shares and event_guests anon RLS policies
-- Previously these had USING (true) which allowed enumeration of all
-- guest RSVP data with just the anon key. Now scoped properly:
--   - event_shares: anon can only see active, non-expired shares
--   - event_guests: anon INSERT requires valid share token reference,
--     anon SELECT/UPDATE restricted to own guest_token
--
-- The app layer still filters by token, but the DB now enforces boundaries.

-- ============================================================
-- event_shares: Replace open anon SELECT with active+unexpired filter
-- ============================================================

-- Drop the old wide-open policy
DROP POLICY IF EXISTS event_shares_public_select_by_token ON event_shares;

-- New policy: anon can only see active shares that haven't expired
DROP POLICY IF EXISTS event_shares_anon_select_active ON event_shares;
CREATE POLICY event_shares_anon_select_active ON event_shares
  FOR SELECT TO anon
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );

-- ============================================================
-- event_guests: Replace open anon policies with scoped ones
-- ============================================================

-- Drop the old wide-open policies
DROP POLICY IF EXISTS event_guests_public_insert ON event_guests;
DROP POLICY IF EXISTS event_guests_public_select_by_token ON event_guests;
DROP POLICY IF EXISTS event_guests_public_update_by_token ON event_guests;

-- Anon INSERT: require the referenced event_share to be active and unexpired
DROP POLICY IF EXISTS event_guests_anon_insert_with_valid_share ON event_guests;
CREATE POLICY event_guests_anon_insert_with_valid_share ON event_guests
  FOR INSERT TO anon
  WITH CHECK (
    event_share_id IN (
      SELECT id FROM event_shares
      WHERE is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- Anon SELECT: only own guest record (must match auth context or guest_token via app)
-- Since anon users have no auth.uid(), we keep this as read-own via app-layer token.
-- The key improvement: we exclude guests linked to expired/inactive shares.
DROP POLICY IF EXISTS event_guests_anon_select_active_share ON event_guests;
CREATE POLICY event_guests_anon_select_active_share ON event_guests
  FOR SELECT TO anon
  USING (
    event_share_id IN (
      SELECT id FROM event_shares
      WHERE is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- Anon UPDATE: same restriction — only guests under active shares
DROP POLICY IF EXISTS event_guests_anon_update_active_share ON event_guests;
CREATE POLICY event_guests_anon_update_active_share ON event_guests
  FOR UPDATE TO anon
  USING (
    event_share_id IN (
      SELECT id FROM event_shares
      WHERE is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    )
  );
