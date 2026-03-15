-- Recurring Meal Prep Scheduling
-- Allows chefs to set up weekly/biweekly/monthly recurring schedules for clients

CREATE TABLE IF NOT EXISTS recurring_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6),
  preferred_time TEXT,
  menu_id UUID REFERENCES menus(id) ON DELETE SET NULL,
  guest_count INT DEFAULT 2,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  next_occurrence DATE,
  last_generated_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Index for fast lookup by tenant + client + active status
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_tenant_client_active
  ON recurring_schedules (tenant_id, client_id, is_active);

-- RLS
ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chefs can view own recurring schedules"
  ON recurring_schedules FOR SELECT
  USING (tenant_id = auth.uid() OR tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Chefs can insert own recurring schedules"
  ON recurring_schedules FOR INSERT
  WITH CHECK (tenant_id = auth.uid() OR tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Chefs can update own recurring schedules"
  ON recurring_schedules FOR UPDATE
  USING (tenant_id = auth.uid() OR tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Chefs can delete own recurring schedules"
  ON recurring_schedules FOR DELETE
  USING (tenant_id = auth.uid() OR tenant_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));
