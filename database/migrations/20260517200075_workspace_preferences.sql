CREATE TABLE IF NOT EXISTS workspace_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  density_mode TEXT NOT NULL DEFAULT 'comfortable',
  workspace_mode TEXT NOT NULL DEFAULT 'overview',
  sidebar_collapsed BOOLEAN NOT NULL DEFAULT false,
  compact_tables BOOLEAN NOT NULL DEFAULT false,
  show_quick_actions BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_workspace_prefs_tenant ON workspace_preferences(tenant_id);
ALTER TABLE workspace_preferences ENABLE ROW LEVEL SECURITY;
