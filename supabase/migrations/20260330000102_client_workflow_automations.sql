-- Client Workflow Automations
-- Multi-step workflow engine tied to ChefFlow's 8-state event FSM.
-- Extends the existing automation_rules (single-step) with sequenced,
-- conditional, delay-aware workflows inspired by HoneyBook + Perfect Venue.
--
-- Existing tables NOT modified:
--   - automation_rules (single-step rules, stays as-is)
--   - automated_sequences (email drip campaigns, stays as-is)
--   - chef_automation_settings (built-in toggles, stays as-is)

-- ============================================
-- TABLE 1: WORKFLOW_TEMPLATES
-- ============================================
-- Each template is a reusable workflow blueprint.
-- Chefs can use system defaults or create custom ones.

CREATE TABLE IF NOT EXISTS workflow_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  name          TEXT NOT NULL,
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,

  -- Whether this is a system-provided default (not deletable, but can be deactivated)
  is_system     BOOLEAN NOT NULL DEFAULT false,

  -- The primary trigger that starts this workflow
  trigger_type  TEXT NOT NULL
                CHECK (trigger_type IN (
                  'event_stage_changed',
                  'inquiry_created',
                  'quote_sent',
                  'quote_viewed',
                  'contract_signed',
                  'payment_received',
                  'days_before_event',
                  'days_after_event'
                )),

  -- Optional filter: only fire for specific stage transitions
  -- e.g. {"from_status": "paid", "to_status": "confirmed"}
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_chef ON workflow_templates(chef_id, is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_trigger ON workflow_templates(trigger_type) WHERE is_active = true;
-- ============================================
-- TABLE 2: WORKFLOW_STEPS
-- ============================================
-- Ordered steps within a workflow. Each step has:
--   - A delay (wait N hours/days after previous step or trigger)
--   - An optional condition (skip this step if condition fails)
--   - An action to execute

CREATE TABLE IF NOT EXISTS workflow_steps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,

  step_order    INTEGER NOT NULL,  -- 1-based ordering

  -- Delay before executing this step (relative to previous step completion or trigger)
  delay_hours   INTEGER NOT NULL DEFAULT 0,

  -- Optional condition: skip this step if condition evaluates to false
  -- e.g. {"type": "quote_accepted", "negate": true} means "if quote NOT accepted"
  condition     JSONB,

  -- Action to execute
  action_type   TEXT NOT NULL
                CHECK (action_type IN (
                  'send_email',
                  'create_task',
                  'create_notification',
                  'update_event_status',
                  'send_feedback_request',
                  'send_payment_reminder'
                )),

  -- Action-specific configuration
  -- send_email: {"subject": "...", "body_template": "...", "template_id": "uuid"}
  -- create_task: {"text": "Follow up with {{client_name}}", "due_hours": 48}
  -- create_notification: {"title": "...", "body": "..."}
  -- update_event_status: {"to_status": "confirmed"}
  -- send_feedback_request: {}
  -- send_payment_reminder: {"message": "..."}
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (template_id, step_order)
);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_template ON workflow_steps(template_id, step_order);
-- ============================================
-- TABLE 3: WORKFLOW_EXECUTIONS
-- ============================================
-- One row per (workflow, entity) activation. Tracks progress through the steps.

CREATE TABLE IF NOT EXISTS workflow_executions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  template_id   UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,

  -- The entity that triggered this workflow
  entity_type   TEXT NOT NULL,  -- 'event', 'inquiry', 'quote'
  entity_id     UUID NOT NULL,

  -- Progress tracking
  current_step  INTEGER NOT NULL DEFAULT 0,  -- 0 = not started, 1+ = step number
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'completed', 'cancelled', 'paused')),

  -- Next step scheduling
  next_step_at  TIMESTAMPTZ,

  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  cancelled_at  TIMESTAMPTZ,

  -- Prevent duplicate enrollments for the same workflow + entity
  UNIQUE (template_id, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_pending
  ON workflow_executions(next_step_at)
  WHERE status = 'active' AND next_step_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_executions_chef
  ON workflow_executions(chef_id, status);
-- ============================================
-- TABLE 4: WORKFLOW_EXECUTION_LOG
-- ============================================
-- Immutable audit trail of every step executed.

CREATE TABLE IF NOT EXISTS workflow_execution_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id  UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  chef_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  step_order    INTEGER NOT NULL,
  action_type   TEXT NOT NULL,

  -- What happened
  status        TEXT NOT NULL DEFAULT 'success'
                CHECK (status IN ('success', 'failed', 'skipped', 'condition_not_met')),
  result        JSONB,
  error         TEXT,

  executed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_log_exec
  ON workflow_execution_log(execution_id, step_order);
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE workflow_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps          ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_execution_log  ENABLE ROW LEVEL SECURITY;
-- Workflow templates
DROP POLICY IF EXISTS wt_chef_all ON workflow_templates;
CREATE POLICY wt_chef_all ON workflow_templates FOR ALL
  USING (
    chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
DROP POLICY IF EXISTS wt_service_all ON workflow_templates;
CREATE POLICY wt_service_all ON workflow_templates FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
-- Workflow steps (owned by chef via parent template)
DROP POLICY IF EXISTS ws_chef_all ON workflow_steps;
CREATE POLICY ws_chef_all ON workflow_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workflow_templates t
      WHERE t.id = template_id
        AND t.chef_id IN (
          SELECT entity_id FROM user_roles
          WHERE auth_user_id = auth.uid() AND role = 'chef'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workflow_templates t
      WHERE t.id = template_id
        AND t.chef_id IN (
          SELECT entity_id FROM user_roles
          WHERE auth_user_id = auth.uid() AND role = 'chef'
        )
    )
  );
DROP POLICY IF EXISTS ws_service_all ON workflow_steps;
CREATE POLICY ws_service_all ON workflow_steps FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
-- Workflow executions
DROP POLICY IF EXISTS we_chef_all ON workflow_executions;
CREATE POLICY we_chef_all ON workflow_executions FOR ALL
  USING (
    chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
DROP POLICY IF EXISTS we_service_all ON workflow_executions;
CREATE POLICY we_service_all ON workflow_executions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
-- Workflow execution log
DROP POLICY IF EXISTS wel_chef_select ON workflow_execution_log;
CREATE POLICY wel_chef_select ON workflow_execution_log FOR SELECT
  USING (
    chef_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
DROP POLICY IF EXISTS wel_service_all ON workflow_execution_log;
CREATE POLICY wel_service_all ON workflow_execution_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS trg_workflow_templates_updated_at ON workflow_templates;
CREATE TRIGGER trg_workflow_templates_updated_at
  BEFORE UPDATE ON workflow_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
