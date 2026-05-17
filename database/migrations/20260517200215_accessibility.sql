-- Accessibility Keyboard And Focus Reliability Pass (UI SYSTEM #46)

CREATE TABLE IF NOT EXISTS a11y_audit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  route TEXT NOT NULL,
  category TEXT NOT NULL,
  element TEXT NOT NULL,
  issue TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'minor',
  wcag_criterion TEXT,
  recommendation TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_a11y_audit_entries_tenant_route ON a11y_audit_entries (tenant_id, route);
CREATE INDEX idx_a11y_audit_entries_tenant_category ON a11y_audit_entries (tenant_id, category);

CREATE TABLE IF NOT EXISTS a11y_route_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  route TEXT NOT NULL,
  keyboard_score INTEGER NOT NULL DEFAULT 0,
  focus_score INTEGER NOT NULL DEFAULT 0,
  aria_score INTEGER NOT NULL DEFAULT 0,
  overall_score INTEGER NOT NULL DEFAULT 0,
  audited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, route)
);

CREATE INDEX idx_a11y_route_scores_tenant_route ON a11y_route_scores (tenant_id, route);
