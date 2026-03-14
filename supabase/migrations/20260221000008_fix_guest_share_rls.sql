-- Fix: Remove overly permissive USING(true) RLS policies on guest/share tables.
--
-- Problem: event_shares and event_guests had public SELECT/INSERT/UPDATE policies
-- with USING(true), allowing anyone with the anon key to enumerate all tokens
-- via the Supabase REST API. This is a token enumeration vulnerability.
--
-- Why safe to remove: All public operations (getEventShareByToken, submitRSVP,
-- updateRSVP, getGuestByToken) already use createServerClient({ admin: true })
-- which bypasses RLS entirely. The anon policies were never needed.
--
-- Authenticated policies (chef_all, client_select, client_insert, client_update)
-- are unchanged and continue to work as expected.

-- ============================================================
-- Drop overly permissive public policies on event_shares
-- ============================================================
DROP POLICY IF EXISTS event_shares_public_select_by_token ON event_shares;

-- ============================================================
-- Drop overly permissive public policies on event_guests
-- ============================================================
DROP POLICY IF EXISTS event_guests_public_insert ON event_guests;
DROP POLICY IF EXISTS event_guests_public_select_by_token ON event_guests;
DROP POLICY IF EXISTS event_guests_public_update_by_token ON event_guests;

-- ============================================================
-- Revoke anon grants (admin client bypasses these anyway)
-- ============================================================
REVOKE SELECT ON event_shares FROM anon;
REVOKE SELECT, INSERT, UPDATE ON event_guests FROM anon;
REVOKE SELECT ON event_rsvp_summary FROM anon;
