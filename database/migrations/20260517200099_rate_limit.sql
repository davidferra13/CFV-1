CREATE TABLE IF NOT EXISTS rate_limit_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_pattern TEXT NOT NULL,
  max_requests INTEGER NOT NULL DEFAULT 10,
  window_seconds INTEGER NOT NULL DEFAULT 60,
  action TEXT NOT NULL DEFAULT 'block',
  enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_rate_rules_path ON rate_limit_rules(path_pattern);

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  path TEXT NOT NULL,
  blocked BOOLEAN NOT NULL DEFAULT false,
  rule_id UUID REFERENCES rate_limit_rules(id),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rate_events_recent ON rate_limit_events(created_at DESC);
CREATE INDEX idx_rate_events_ip ON rate_limit_events(ip_address, created_at DESC);
ALTER TABLE rate_limit_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;
