-- Daily Specials Calendar
-- Schedule and display daily specials with seasonal menu planning.

-- Special category enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'special_category') THEN
    CREATE TYPE special_category AS ENUM ('appetizer', 'entree', 'dessert', 'drink', 'side');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS daily_specials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  special_date date NOT NULL,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'entree'
    CHECK (category IN ('appetizer', 'entree', 'dessert', 'drink', 'side')),
  product_id uuid REFERENCES product_projections(id) ON DELETE SET NULL,
  is_recurring boolean NOT NULL DEFAULT false,
  recurring_day integer CHECK (recurring_day IS NULL OR (recurring_day >= 0 AND recurring_day <= 6)),
  available boolean NOT NULL DEFAULT true,
  image_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_specials_chef_date ON daily_specials(chef_id, special_date);
CREATE INDEX IF NOT EXISTS idx_daily_specials_chef_recurring ON daily_specials(chef_id, is_recurring) WHERE is_recurring = true;

-- RLS
ALTER TABLE daily_specials ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_specials_tenant_select ON daily_specials
  FOR SELECT USING (chef_id = (SELECT id FROM chefs WHERE user_id = auth.uid()));

CREATE POLICY daily_specials_tenant_insert ON daily_specials
  FOR INSERT WITH CHECK (chef_id = (SELECT id FROM chefs WHERE user_id = auth.uid()));

CREATE POLICY daily_specials_tenant_update ON daily_specials
  FOR UPDATE USING (chef_id = (SELECT id FROM chefs WHERE user_id = auth.uid()));

CREATE POLICY daily_specials_tenant_delete ON daily_specials
  FOR DELETE USING (chef_id = (SELECT id FROM chefs WHERE user_id = auth.uid()));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_daily_specials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER daily_specials_updated_at
  BEFORE UPDATE ON daily_specials
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_specials_updated_at();
