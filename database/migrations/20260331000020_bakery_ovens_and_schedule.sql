-- Bakery Ovens & Bake Schedule: oven management and scheduling
-- Additive migration: creates new tables, no existing data affected

-- Oven inventory
CREATE TABLE IF NOT EXISTS bakery_ovens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name text NOT NULL,
  oven_type text NOT NULL CHECK (oven_type IN ('deck', 'convection', 'combi', 'rotary', 'proofer', 'other')),
  max_temp_f integer,
  capacity_trays integer,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bakery_ovens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bakery_ovens_tenant_isolation" ON bakery_ovens;
CREATE POLICY "bakery_ovens_tenant_isolation" ON bakery_ovens
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());
-- Bake schedule entries
CREATE TABLE IF NOT EXISTS bake_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  oven_id uuid NOT NULL REFERENCES bakery_ovens(id) ON DELETE CASCADE,
  batch_id uuid, -- no FK: bakery_batches table may not exist yet
  product_name text NOT NULL,
  planned_start timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  temp_f integer NOT NULL,
  trays_used integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'preheating', 'baking', 'cooling', 'done')),
  actual_start timestamptz,
  actual_end timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bake_schedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bake_schedule_tenant_isolation" ON bake_schedule;
CREATE POLICY "bake_schedule_tenant_isolation" ON bake_schedule
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());
CREATE INDEX idx_bake_schedule_tenant_start ON bake_schedule (tenant_id, planned_start);
-- Yield tracking per batch
CREATE TABLE IF NOT EXISTS bakery_yield_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  batch_id uuid, -- no FK: bakery_batches table may not exist yet
  bake_schedule_id uuid REFERENCES bake_schedule(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  expected_yield integer NOT NULL,
  actual_yield integer NOT NULL,
  variance_pct numeric(6,2) NOT NULL, -- (actual - expected) / expected * 100
  waste_units integer DEFAULT 0,
  waste_reason text CHECK (waste_reason IS NULL OR waste_reason IN ('burnt', 'misshapen', 'underproofed', 'overbaked', 'dropped', 'other')),
  quality_rating integer CHECK (quality_rating IS NULL OR (quality_rating >= 1 AND quality_rating <= 5)),
  notes text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bakery_yield_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bakery_yield_records_tenant_isolation" ON bakery_yield_records;
CREATE POLICY "bakery_yield_records_tenant_isolation" ON bakery_yield_records
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());
CREATE INDEX idx_bakery_yield_tenant_date ON bakery_yield_records (tenant_id, recorded_at);
