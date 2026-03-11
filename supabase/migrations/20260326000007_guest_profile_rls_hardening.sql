-- Fix: remove overly permissive anonymous access on guest_event_profile.
--
-- Public guest flows already use createServerClient({ admin: true }) and enforce
-- event_id + guest_token checks in app logic, so anon table grants/policies are
-- unnecessary and create token-enumeration risk via direct REST queries.

DROP POLICY IF EXISTS guest_event_profile_public_select ON guest_event_profile;
DROP POLICY IF EXISTS guest_event_profile_public_insert ON guest_event_profile;
DROP POLICY IF EXISTS guest_event_profile_public_update ON guest_event_profile;
REVOKE SELECT, INSERT, UPDATE, DELETE ON guest_event_profile FROM anon;
