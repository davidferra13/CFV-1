-- ============================================================
-- Chef Goals System
-- Adds structured multi-type goal tracking, monthly snapshot
-- history, and client outreach suggestion pipeline.
-- Entirely additive — no DROP, ALTER, or TRUNCATE.
-- ============================================================

-- ── ENUM: goal type ──────────────────────────────────────────────────────────
CREATE TYPE chef_goal_type AS ENUM (
  'revenue_monthly',
  'revenue_annual',
  'revenue_custom',
  'booking_count',
  'new_clients',
  'recipe_library',
  'profit_margin',
  'expense_ratio'
);

-- ── ENUM: goal status ────────────────────────────────────────────────────────
CREATE TYPE chef_goal_status AS ENUM (
  'active',
  'paused',
  'completed',
  'archived'
);

-- ── TABLE 1: chef_goals ──────────────────────────────────────────────────────
-- One record per goal definition. A chef may have multiple active goals
-- of the same type (e.g. two revenue_custom goals for different date ranges).
--
-- target_value semantics by goal_type:
--   revenue_*   → cents (integer), e.g. 1000000 = $10,000
--   booking_count, new_clients, recipe_library → whole count
--   profit_margin, expense_ratio → basis points, e.g. 6500 = 65.00%

CREATE TABLE chef_goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  goal_type     chef_goal_type NOT NULL,
  label         TEXT NOT NULL,
  status        chef_goal_status NOT NULL DEFAULT 'active',
  target_value  INTEGER NOT NULL CHECK (target_value >= 0),
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  nudge_enabled BOOLEAN NOT NULL DEFAULT true,
  nudge_level   TEXT NOT NULL DEFAULT 'standard'
    CHECK (nudge_level IN ('gentle', 'standard', 'aggressive')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chef_goals_period_order CHECK (period_start <= period_end)
);

CREATE INDEX idx_chef_goals_tenant_status
  ON chef_goals (tenant_id, status);
CREATE INDEX idx_chef_goals_tenant_type
  ON chef_goals (tenant_id, goal_type, status);

-- ── TABLE 2: goal_snapshots ───────────────────────────────────────────────────
-- Append-only historical record. Inserted once per cron run per (goal, date).
-- One row per (goal_id, snapshot_date). The UNIQUE constraint ensures
-- idempotent inserts: ON CONFLICT DO NOTHING.

CREATE TABLE goal_snapshots (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  goal_id                 UUID NOT NULL REFERENCES chef_goals(id) ON DELETE CASCADE,
  snapshot_date           DATE NOT NULL,
  snapshot_month          TEXT NOT NULL, -- 'YYYY-MM' for easy grouping/filtering
  current_value           INTEGER NOT NULL DEFAULT 0,
  target_value            INTEGER NOT NULL,
  gap_value               INTEGER NOT NULL DEFAULT 0,   -- max(0, target - current)
  progress_percent        INTEGER NOT NULL DEFAULT 0,   -- 0–999
  -- Revenue-specific enrichment (NULL for non-revenue goals)
  realized_cents          INTEGER,
  projected_cents         INTEGER,
  avg_booking_value_cents INTEGER,
  events_needed           INTEGER,
  -- Denormalized JSON context at time of snapshot
  pricing_scenarios       JSONB NOT NULL DEFAULT '[]'::jsonb,
  client_suggestions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  computed_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT goal_snapshots_unique_goal_date UNIQUE (goal_id, snapshot_date)
);

CREATE INDEX idx_goal_snapshots_tenant_month
  ON goal_snapshots (tenant_id, snapshot_month DESC);
CREATE INDEX idx_goal_snapshots_goal_date
  ON goal_snapshots (goal_id, snapshot_date DESC);

-- ── TABLE 3: goal_client_suggestions ─────────────────────────────────────────
-- Tracks which clients were surfaced as outreach candidates for a goal
-- and whether the chef acted on them. One row per (goal_id, client_id).
-- Status transitions: pending → contacted | dismissed | booked | declined

CREATE TABLE goal_client_suggestions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  goal_id              UUID NOT NULL REFERENCES chef_goals(id) ON DELETE CASCADE,
  client_id            UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  reason               TEXT NOT NULL,
  rank                 INTEGER NOT NULL DEFAULT 0, -- lower = higher priority
  status               TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'contacted', 'booked', 'declined', 'dismissed')),
  contacted_at         TIMESTAMPTZ,
  booked_event_id      UUID REFERENCES events(id) ON DELETE SET NULL,
  days_dormant         INTEGER,
  avg_spend_cents      INTEGER,
  lifetime_value_cents INTEGER,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT goal_client_suggestions_unique UNIQUE (goal_id, client_id)
);

CREATE INDEX idx_goal_client_suggestions_tenant_goal
  ON goal_client_suggestions (tenant_id, goal_id, status);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────

ALTER TABLE chef_goals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_snapshots          ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_client_suggestions ENABLE ROW LEVEL SECURITY;

-- chef_goals: tenant-scoped select/insert/update (no delete — use archived status)
CREATE POLICY chef_goals_select ON chef_goals
  FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY chef_goals_insert ON chef_goals
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY chef_goals_update ON chef_goals
  FOR UPDATE USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- goal_snapshots: append-only (no update/delete from client)
CREATE POLICY goal_snapshots_select ON goal_snapshots
  FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY goal_snapshots_insert ON goal_snapshots
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

-- goal_client_suggestions: tenant-scoped select/insert/update
CREATE POLICY goal_client_suggestions_select ON goal_client_suggestions
  FOR SELECT USING (tenant_id = get_current_tenant_id());
CREATE POLICY goal_client_suggestions_insert ON goal_client_suggestions
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY goal_client_suggestions_update ON goal_client_suggestions
  FOR UPDATE USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
