-- AI Usage Log: tracks per-request AI provider usage for analytics and cost awareness.
-- Additive only. No destructive changes.

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  provider text NOT NULL,
  model text NOT NULL,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  latency_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for per-tenant queries sorted by time
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_tenant_time
  ON ai_usage_log (tenant_id, created_at DESC);

-- Index for provider-level aggregation
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_provider
  ON ai_usage_log (provider, created_at DESC);

-- Enable RLS
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Chefs can read their own usage
CREATE POLICY "Chefs read own AI usage"
  ON ai_usage_log
  FOR SELECT
  TO public
  USING (
    tenant_id IN (
      SELECT user_roles.entity_id
      FROM user_roles
      WHERE user_roles.auth_user_id = auth.uid()
        AND user_roles.role = 'chef'::user_role
    )
  );

-- Service role has full access (for server-side inserts)
CREATE POLICY "Service role manages AI usage"
  ON ai_usage_log
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
