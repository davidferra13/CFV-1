-- Migration: 20260511000001_sourcing_sessions
-- Description: Creates the data layer for AI Calling System v2 (sourcing sessions).
-- Tables: sourcing_sessions, sourcing_session_candidates, vendor_call_limits, call_cost_log
-- Also adds new columns to ai_call_routing_rules for vendor call limits and feature flags.

-- 1. sourcing_sessions - A batch sourcing session (chef says "find me sunchokes")
CREATE TABLE IF NOT EXISTS sourcing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id),
  ingredient_query TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'paused', 'completed', 'cancelled')),
  stop_after_confirmations INT DEFAULT 3,
  ask_price BOOLEAN DEFAULT true,
  ask_hold BOOLEAN DEFAULT false,
  leave_voicemail BOOLEAN DEFAULT false,
  max_calls INT DEFAULT 20,
  total_calls_placed INT DEFAULT 0,
  total_confirmed INT DEFAULT 0,
  total_unavailable INT DEFAULT 0,
  total_no_answer INT DEFAULT 0,
  estimated_cost_cents INT,
  actual_cost_cents INT DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sourcing_sessions_chef ON sourcing_sessions(chef_id);
CREATE INDEX idx_sourcing_sessions_status ON sourcing_sessions(chef_id, status);

-- 2. sourcing_session_candidates - Each vendor/store in a session's call list
CREATE TABLE IF NOT EXISTS sourcing_session_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sourcing_sessions(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id),
  vendor_name TEXT NOT NULL,
  vendor_phone TEXT NOT NULL,
  vendor_type TEXT DEFAULT 'unknown' CHECK (vendor_type IN ('saved', 'directory', 'adhoc', 'unknown')),
  priority_order INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'calling', 'completed', 'skipped', 'failed')),
  result TEXT CHECK (result IN ('in_stock', 'out_of_stock', 'no_answer', 'busy', 'voicemail_left', 'error', NULL)),
  price_quoted TEXT,
  price_cents INT,
  quantity_available TEXT,
  unit TEXT,
  can_hold BOOLEAN,
  hold_until TEXT,
  transcript TEXT,
  call_duration_seconds INT,
  call_cost_cents INT,
  call_sid TEXT,
  ai_call_id UUID REFERENCES ai_calls(id),
  supplier_call_id UUID REFERENCES supplier_calls(id),
  called_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sourcing_candidates_session ON sourcing_session_candidates(session_id);
CREATE INDEX idx_sourcing_candidates_status ON sourcing_session_candidates(session_id, status);

-- 3. vendor_call_limits - Anti-spam tracking per vendor
CREATE TABLE IF NOT EXISTS vendor_call_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id),
  vendor_phone TEXT NOT NULL,
  vendor_name TEXT,
  last_called_at TIMESTAMPTZ,
  calls_today INT DEFAULT 0,
  calls_this_week INT DEFAULT 0,
  consecutive_no_answers INT DEFAULT 0,
  is_blocked BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  blocked_at TIMESTAMPTZ,
  cooldown_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chef_id, vendor_phone)
);
CREATE INDEX idx_vendor_call_limits_chef ON vendor_call_limits(chef_id);
CREATE INDEX idx_vendor_call_limits_cooldown ON vendor_call_limits(chef_id, cooldown_until);

-- 4. call_cost_log - Per-call cost tracking
CREATE TABLE IF NOT EXISTS call_cost_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id),
  session_id UUID REFERENCES sourcing_sessions(id),
  ai_call_id UUID REFERENCES ai_calls(id),
  call_sid TEXT,
  direction TEXT NOT NULL DEFAULT 'outbound',
  duration_seconds INT,
  cost_cents INT NOT NULL DEFAULT 0,
  call_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_call_cost_log_chef ON call_cost_log(chef_id, call_date);
CREATE INDEX idx_call_cost_log_session ON call_cost_log(session_id);

-- 5. Add new columns to existing ai_call_routing_rules table
ALTER TABLE ai_call_routing_rules
  ADD COLUMN IF NOT EXISTS max_calls_per_vendor_per_day INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_calls_per_vendor_per_week INT DEFAULT 2,
  ADD COLUMN IF NOT EXISTS vendor_cooldown_hours INT DEFAULT 48,
  ADD COLUMN IF NOT EXISTS call_velocity_max INT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS call_velocity_spacing_seconds INT DEFAULT 30,
  ADD COLUMN IF NOT EXISTS cost_alert_threshold_cents INT DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS enable_staff_dispatch BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_equipment_rental BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_venue_scout BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_vendor_onboarding BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_vendor_feedback BOOLEAN DEFAULT false;
