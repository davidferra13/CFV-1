-- Security Events Audit Log
-- Phase 4: Security hardening. Tracks all security-relevant account events.
-- Additive migration: no existing tables modified.

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  -- event_types: 'login_success', 'login_failed', 'mfa_enabled', 'mfa_disabled',
  -- 'phone_added', 'phone_removed', 'phone_verified', 'email_changed',
  -- 'password_changed', 'recovery_code_used', 'session_revoked',
  -- 'sensitive_action_reauth', 'account_locked', 'account_unlocked',
  -- 'data_exported', 'client_data_accessed'
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(auth_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address, created_at DESC);
