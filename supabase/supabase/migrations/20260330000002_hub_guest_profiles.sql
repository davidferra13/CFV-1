-- =============================================================================
-- Migration: Social Event Hub — Guest Profiles
-- Layer: Hub Foundation
-- Purpose: Persistent guest identity across all events and chefs
-- =============================================================================

-- Guest profiles — cross-event identity
CREATE TABLE IF NOT EXISTS hub_guest_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  email TEXT,
  email_normalized TEXT GENERATED ALWAYS AS (lower(trim(email))) STORED,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,

  -- Persistent access token (for link-based auth, no login needed)
  profile_token UUID NOT NULL DEFAULT gen_random_uuid(),

  -- Optional account link
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Aggregated preferences (cached from all events)
  known_allergies TEXT[] DEFAULT '{}',
  known_dietary TEXT[] DEFAULT '{}',

  -- Settings
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique on normalized email (when email is provided)
CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_guest_profiles_email
  ON hub_guest_profiles(email_normalized)
  WHERE email_normalized IS NOT NULL;

-- Profile token lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_guest_profiles_token
  ON hub_guest_profiles(profile_token);

-- Auth user lookup
CREATE INDEX IF NOT EXISTS idx_hub_guest_profiles_auth_user
  ON hub_guest_profiles(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Client lookup
CREATE INDEX IF NOT EXISTS idx_hub_guest_profiles_client
  ON hub_guest_profiles(client_id)
  WHERE client_id IS NOT NULL;

-- Guest event history — links profiles to past events
CREATE TABLE IF NOT EXISTS hub_guest_event_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_guest_id UUID REFERENCES event_guests(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Snapshot of what they experienced
  rsvp_status TEXT,
  courses_served JSONB,
  chef_name TEXT,
  event_date DATE,
  occasion TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_guest_event_history_unique
  ON hub_guest_event_history(profile_id, event_id);

CREATE INDEX IF NOT EXISTS idx_hub_guest_event_history_profile
  ON hub_guest_event_history(profile_id);

CREATE INDEX IF NOT EXISTS idx_hub_guest_event_history_event
  ON hub_guest_event_history(event_id);

-- RLS
ALTER TABLE hub_guest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_guest_event_history ENABLE ROW LEVEL SECURITY;

-- Profiles: public read for profile data (link-based access, no auth required)
CREATE POLICY "hub_guest_profiles_select_anon" ON hub_guest_profiles
  FOR SELECT USING (true);

-- Profiles: anon can insert (joining a group for the first time)
CREATE POLICY "hub_guest_profiles_insert_anon" ON hub_guest_profiles
  FOR INSERT WITH CHECK (true);

-- Profiles: service role can do everything
CREATE POLICY "hub_guest_profiles_manage_service" ON hub_guest_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Event history: readable by profile owner (via service role in app layer)
CREATE POLICY "hub_guest_event_history_select_anon" ON hub_guest_event_history
  FOR SELECT USING (true);

-- Event history: service role manages
CREATE POLICY "hub_guest_event_history_manage_service" ON hub_guest_event_history
  FOR ALL USING (auth.role() = 'service_role');

-- Chefs can read event history for their tenant
CREATE POLICY "hub_guest_event_history_chef_read" ON hub_guest_event_history
  FOR SELECT USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
