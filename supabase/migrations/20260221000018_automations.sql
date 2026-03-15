-- ============================================================================
-- Automations Engine — Phase 3
-- Chef-configurable rule-based triggers that fire on system events and
-- execute actions (notifications, follow-up tasks, draft messages, notes).
-- Deterministic rules authored by chefs (AI Policy compliant — no AI decisions).
-- ============================================================================

-- ─── Automation Rules ─────────────────────────────────────────────────────

CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Identity
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Trigger: what event fires this rule
  trigger_event TEXT NOT NULL,
  -- Valid: 'inquiry_created', 'inquiry_status_changed', 'wix_submission_received',
  --   'event_status_changed', 'follow_up_overdue', 'no_response_timeout',
  --   'quote_expiring', 'event_approaching'

  -- Conditions: when should the action fire (evaluated as AND)
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Example: [{"field": "channel", "op": "eq", "value": "wix"},
  --           {"field": "days_since_last_contact", "op": "gt", "value": 3}]

  -- Action: what to do when triggered
  action_type TEXT NOT NULL,
  -- Valid: 'create_notification', 'create_follow_up_task',
  --   'send_template_message', 'create_internal_note'

  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Examples:
  --   create_notification: {"title": "New lead!", "body": "{{submitter_name}} via Wix"}
  --   send_template_message: {"template_id": "uuid", "channel": "email"}
  --     (creates as draft — respects approval workflow)
  --   create_follow_up_task: {"description": "Follow up with client", "due_hours": 48}
  --   create_internal_note: {"note": "Auto-flagged: high-value inquiry"}

  -- Execution tracking
  last_fired_at TIMESTAMPTZ,
  total_fires INTEGER NOT NULL DEFAULT 0,

  -- Ordering
  priority INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Automation Execution Log ─────────────────────────────────────────────
-- Immutable audit trail of every rule firing.

CREATE TABLE automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,

  -- What triggered it
  trigger_event TEXT NOT NULL,
  trigger_entity_id UUID,
  trigger_entity_type TEXT,  -- 'inquiry', 'event', 'wix_submission'

  -- What happened
  action_type TEXT NOT NULL,
  action_result JSONB,

  -- Status
  status TEXT NOT NULL DEFAULT 'success'
    CHECK (status IN ('success', 'failed', 'skipped')),
  error TEXT,

  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────

CREATE INDEX idx_automation_rules_tenant
  ON automation_rules(tenant_id, is_active);

CREATE INDEX idx_automation_rules_trigger
  ON automation_rules(trigger_event) WHERE is_active = true;

CREATE INDEX idx_automation_executions_tenant
  ON automation_executions(tenant_id, executed_at DESC);

CREATE INDEX idx_automation_executions_rule
  ON automation_executions(rule_id, executed_at DESC);

-- ─── RLS Policies ─────────────────────────────────────────────────────────

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;

-- Chefs manage their own automation rules
DROP POLICY IF EXISTS "Chefs manage own automation rules" ON automation_rules;
CREATE POLICY "Chefs manage own automation rules"
  ON automation_rules
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Chefs read their own execution logs
DROP POLICY IF EXISTS "Chefs read own automation executions" ON automation_executions;
CREATE POLICY "Chefs read own automation executions"
  ON automation_executions
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );

-- Service role manages everything (for cron + webhook processing)
DROP POLICY IF EXISTS "Service role manages automation rules" ON automation_rules;
CREATE POLICY "Service role manages automation rules"
  ON automation_rules
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages automation executions" ON automation_executions;
CREATE POLICY "Service role manages automation executions"
  ON automation_executions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
