-- SMS Bridge: allows chefs to forward texts from their personal phone into ChefFlow.
-- Token-authenticated API endpoint. Personal contacts blocklist filters non-business messages.

CREATE TABLE IF NOT EXISTS sms_bridge_config (
  tenant_id UUID PRIMARY KEY REFERENCES chefs(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  token_prefix TEXT NOT NULL CHECK (length(token_prefix) <= 8),
  enabled BOOLEAN NOT NULL DEFAULT true,
  personal_blocklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  messages_forwarded BIGINT NOT NULL DEFAULT 0,
  messages_blocked BIGINT NOT NULL DEFAULT 0,
  last_forwarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_bridge_token_prefix ON sms_bridge_config (token_prefix) WHERE enabled = true;

-- Atomic stat increment function
CREATE OR REPLACE FUNCTION increment_sms_bridge_stat(
  p_tenant_id UUID,
  p_field TEXT
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_field = 'forwarded' THEN
    UPDATE sms_bridge_config
    SET messages_forwarded = messages_forwarded + 1,
        last_forwarded_at = now(),
        updated_at = now()
    WHERE tenant_id = p_tenant_id;
  ELSIF p_field = 'blocked' THEN
    UPDATE sms_bridge_config
    SET messages_blocked = messages_blocked + 1,
        updated_at = now()
    WHERE tenant_id = p_tenant_id;
  END IF;
END;
$$;

-- RLS: chef can only see their own config
ALTER TABLE sms_bridge_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY sms_bridge_config_chef_all ON sms_bridge_config
  FOR ALL TO public
  USING (tenant_id IN (
    SELECT user_roles.entity_id FROM user_roles
    WHERE user_roles.auth_user_id = auth.uid() AND user_roles.role = 'chef'::user_role
  ))
  WITH CHECK (tenant_id IN (
    SELECT user_roles.entity_id FROM user_roles
    WHERE user_roles.auth_user_id = auth.uid() AND user_roles.role = 'chef'::user_role
  ));

-- Service role bypass (restrict to service_role only)
CREATE POLICY sms_bridge_config_service_all ON sms_bridge_config
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
