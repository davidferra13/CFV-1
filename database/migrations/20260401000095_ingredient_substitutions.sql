-- Ingredient Substitutions Table
-- Stores chef-specific ingredient substitution knowledge.
-- System-level defaults are stored in TypeScript (lib/ingredients/substitution-seed.ts),
-- not in this table. This table is for chef's personal additions only.
--
-- Additive migration: creates new table, no existing data affected.

CREATE TABLE IF NOT EXISTS ingredient_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  original TEXT NOT NULL,
  substitute TEXT NOT NULL,
  ratio TEXT NOT NULL,
  notes TEXT,
  dietary_safe_for TEXT[] DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'chef' CHECK (source IN ('system', 'chef')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ingredient_subs_chef
  ON ingredient_substitutions(chef_id);

CREATE INDEX IF NOT EXISTS idx_ingredient_subs_original_lower
  ON ingredient_substitutions(chef_id, lower(original));

-- Prevent exact duplicates per chef
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredient_subs_unique
  ON ingredient_substitutions(chef_id, lower(original), lower(substitute));

-- RLS
ALTER TABLE ingredient_substitutions ENABLE ROW LEVEL SECURITY;

-- Chef can read and manage their own substitutions
CREATE POLICY "chef_own_substitutions"
  ON ingredient_substitutions
  FOR ALL
  USING (chef_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (chef_id = (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

-- Updated_at auto-update trigger (reuse existing function if available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    CREATE TRIGGER set_ingredient_subs_updated_at
      BEFORE UPDATE ON ingredient_substitutions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
