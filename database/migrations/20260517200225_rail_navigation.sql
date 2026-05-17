-- Rail Navigation: event lifecycle rail stages, progress tracking, nav shortcuts

-- Rail stages: define the lifecycle stages for event progression
CREATE TABLE IF NOT EXISTS rail_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  label text NOT NULL,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  color text,
  completion_criteria jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rail_stages_tenant_stage
  ON rail_stages (tenant_id, stage_name);

CREATE INDEX IF NOT EXISTS idx_rail_stages_tenant_sort
  ON rail_stages (tenant_id, sort_order);

-- Rail progress: per-event stage completion tracking
CREATE TABLE IF NOT EXISTS rail_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES rail_stages(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'completed', 'skipped')),
  completed_at timestamptz,
  completion_percent integer NOT NULL DEFAULT 0
    CHECK (completion_percent >= 0 AND completion_percent <= 100),
  blockers text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rail_progress_tenant_event_stage
  ON rail_progress (tenant_id, event_id, stage_id);

CREATE INDEX IF NOT EXISTS idx_rail_progress_event
  ON rail_progress (tenant_id, event_id);

CREATE INDEX IF NOT EXISTS idx_rail_progress_status
  ON rail_progress (tenant_id, status)
  WHERE status IN ('active', 'pending');

-- Rail nav shortcuts: quick-jump links per stage
CREATE TABLE IF NOT EXISTS rail_nav_shortcuts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  shortcut_label text NOT NULL,
  target_route text NOT NULL,
  hotkey text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rail_nav_shortcuts_tenant_stage
  ON rail_nav_shortcuts (tenant_id, stage_name);
