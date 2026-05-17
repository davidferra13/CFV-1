-- QR Circle Join: token-based circle enrollment via QR codes
-- Additive only. No DROP, no DELETE, no ALTER existing columns.

CREATE TABLE IF NOT EXISTS circle_join_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  circle_id UUID NOT NULL,
  token TEXT UNIQUE NOT NULL,
  token_type TEXT NOT NULL CHECK (token_type IN ('persistent', 'event')),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_circle_join_tokens_circle
  ON circle_join_tokens (circle_id);

CREATE INDEX IF NOT EXISTS idx_circle_join_tokens_tenant
  ON circle_join_tokens (tenant_id);

CREATE INDEX IF NOT EXISTS idx_circle_join_tokens_event
  ON circle_join_tokens (event_id)
  WHERE event_id IS NOT NULL;

-- RLS: chefs see their own tokens; public can resolve by token value
ALTER TABLE circle_join_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY chef_circle_join_tokens ON circle_join_tokens
  FOR ALL TO public
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

CREATE POLICY public_resolve_circle_join_token ON circle_join_tokens
  FOR SELECT TO public
  USING (true);
