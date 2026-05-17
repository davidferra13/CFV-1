-- Migration: Component-Aware Prep Scheduling
-- Adds event_prep_schedules and prep_tasks tables for structured prep timelines.
-- ADDITIVE ONLY. No drops, no deletes, no column modifications.

-- Schedule container: one per event, tracks overall status
CREATE TABLE IF NOT EXISTS event_prep_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for event_prep_schedules
CREATE INDEX IF NOT EXISTS idx_prep_schedules_event ON event_prep_schedules(event_id);
CREATE INDEX IF NOT EXISTS idx_prep_schedules_tenant ON event_prep_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prep_schedules_status ON event_prep_schedules(tenant_id, status);

-- RLS policies for event_prep_schedules
ALTER TABLE event_prep_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY eps_chef_select ON event_prep_schedules
  FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY eps_chef_insert ON event_prep_schedules
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY eps_chef_update ON event_prep_schedules
  FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY eps_chef_delete ON event_prep_schedules
  FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant_id());

-- Individual prep tasks within a schedule
CREATE TABLE IF NOT EXISTS prep_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES event_prep_schedules(id) ON DELETE CASCADE,
  component_id UUID REFERENCES components(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 60,
  actual_minutes INTEGER,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  start_time TIMESTAMPTZ,
  due_time TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for prep_tasks
CREATE INDEX IF NOT EXISTS idx_prep_tasks_schedule ON prep_tasks(schedule_id);
CREATE INDEX IF NOT EXISTS idx_prep_tasks_component ON prep_tasks(component_id) WHERE component_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prep_tasks_sequence ON prep_tasks(schedule_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_prep_tasks_incomplete ON prep_tasks(schedule_id) WHERE completed_at IS NULL;

-- RLS policies for prep_tasks (access through schedule's tenant)
ALTER TABLE prep_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY pt_chef_select ON prep_tasks
  FOR SELECT TO authenticated
  USING (schedule_id IN (
    SELECT id FROM event_prep_schedules WHERE tenant_id = get_current_tenant_id()
  ));

CREATE POLICY pt_chef_insert ON prep_tasks
  FOR INSERT TO authenticated
  WITH CHECK (schedule_id IN (
    SELECT id FROM event_prep_schedules WHERE tenant_id = get_current_tenant_id()
  ));

CREATE POLICY pt_chef_update ON prep_tasks
  FOR UPDATE TO authenticated
  USING (schedule_id IN (
    SELECT id FROM event_prep_schedules WHERE tenant_id = get_current_tenant_id()
  ));

CREATE POLICY pt_chef_delete ON prep_tasks
  FOR DELETE TO authenticated
  USING (schedule_id IN (
    SELECT id FROM event_prep_schedules WHERE tenant_id = get_current_tenant_id()
  ));
