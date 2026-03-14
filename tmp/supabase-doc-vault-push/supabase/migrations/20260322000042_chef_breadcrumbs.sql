-- Chef Breadcrumbs — Lightweight navigation tracking for "Retrace" mode
-- Records every page visit and key interaction for the chef portal.
-- High-volume, 30-day TTL. Used for the step-by-step retrace view.

CREATE TABLE IF NOT EXISTS chef_breadcrumbs (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  actor_id      uuid NOT NULL,                        -- auth.uid()
  breadcrumb_type text NOT NULL DEFAULT 'page_view',  -- page_view | click | form_open | tab_switch | search
  path          text NOT NULL,                        -- e.g. /pipeline/events/abc-123
  label         text,                                 -- human-readable: "Event: Johnson Wedding"
  referrer_path text,                                 -- previous path (where they came from)
  metadata      jsonb DEFAULT '{}'::jsonb,            -- extra context: { button: "Send Quote", tab: "details" }
  session_id    text,                                 -- client-generated session ID (groups breadcrumbs)
  created_at    timestamptz DEFAULT now() NOT NULL
);
-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_breadcrumbs_tenant_time
  ON chef_breadcrumbs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_breadcrumbs_session
  ON chef_breadcrumbs (tenant_id, session_id, created_at ASC);
-- RLS
ALTER TABLE chef_breadcrumbs ENABLE ROW LEVEL SECURITY;
-- Chefs can read their own breadcrumbs
CREATE POLICY breadcrumbs_chef_read ON chef_breadcrumbs
  FOR SELECT TO authenticated
  USING (tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));
-- Insert via service role only (API route uses admin client)
CREATE POLICY breadcrumbs_service_insert ON chef_breadcrumbs
  FOR INSERT TO service_role
  WITH CHECK (true);
-- Auto-cleanup: rows older than 30 days (run via pg_cron or manual sweep)
COMMENT ON TABLE chef_breadcrumbs IS 'Lightweight navigation breadcrumbs for chef retrace view. 30-day TTL.';
