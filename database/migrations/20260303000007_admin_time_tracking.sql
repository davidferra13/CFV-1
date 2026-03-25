-- Admin Time Tracking
-- Extends time tracking beyond the 5 on-site event phases to capture
-- administrative time (emails, calls, planning, bookkeeping, marketing).
-- Each entry is optionally linked to a specific event for full hourly rate analysis.

CREATE TABLE admin_time_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id     UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  category    TEXT NOT NULL DEFAULT 'other'
              CHECK (category IN (
                'email',
                'calls',
                'planning',
                'bookkeeping',
                'marketing',
                'sourcing',
                'travel_admin',
                'other'
              )),
  log_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  minutes     INTEGER NOT NULL CHECK (minutes > 0),
  notes       TEXT,

  -- Optional link to an event (for event-level total time including admin)
  event_id    UUID REFERENCES events(id) ON DELETE SET NULL,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_time_chef_date     ON admin_time_logs(chef_id, log_date DESC);
CREATE INDEX idx_admin_time_chef_category ON admin_time_logs(chef_id, category);
CREATE INDEX idx_admin_time_event         ON admin_time_logs(event_id);

COMMENT ON TABLE admin_time_logs IS 'Tracks administrative time outside of on-site event phases. Used to compute true hourly rate including all business overhead.';
COMMENT ON COLUMN admin_time_logs.event_id IS 'Optional. If set, this admin time is included in total time for that event''s effective hourly rate.';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE admin_time_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS atl_chef_select ON admin_time_logs;
CREATE POLICY atl_chef_select ON admin_time_logs
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS atl_chef_insert ON admin_time_logs;
CREATE POLICY atl_chef_insert ON admin_time_logs
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS atl_chef_update ON admin_time_logs;
CREATE POLICY atl_chef_update ON admin_time_logs
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS atl_chef_delete ON admin_time_logs;
CREATE POLICY atl_chef_delete ON admin_time_logs
  FOR DELETE USING (
    get_current_user_role() = 'chef' AND
    chef_id = get_current_tenant_id()
  );
