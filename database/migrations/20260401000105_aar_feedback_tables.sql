-- AAR Recipe Feedback: per-recipe feedback from after-action reviews
-- Closes the feedback loop: AAR ratings flow back to recipes and ingredients
--
-- When a chef files an AAR, they can now rate individual recipes used at the event:
--   - Timing accuracy (was prep faster/slower/accurate vs estimate?)
--   - Would use again (would they put this on a menu again?)
--   - Notes (specific observations about this recipe at this event)
-- This data surfaces on the recipe detail page as a "track record."

CREATE TABLE IF NOT EXISTS aar_recipe_feedback (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aar_id            UUID NOT NULL REFERENCES after_action_reviews(id) ON DELETE CASCADE,
  recipe_id         UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  timing_accuracy   TEXT CHECK (timing_accuracy IN ('faster', 'accurate', 'slower')),
  would_use_again   BOOLEAN DEFAULT true,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One feedback entry per recipe per AAR (no duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_aar_recipe_feedback_unique ON aar_recipe_feedback(aar_id, recipe_id);
CREATE INDEX IF NOT EXISTS idx_aar_recipe_feedback_recipe ON aar_recipe_feedback(recipe_id);
CREATE INDEX IF NOT EXISTS idx_aar_recipe_feedback_tenant ON aar_recipe_feedback(tenant_id);

-- RLS
ALTER TABLE aar_recipe_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aar_recipe_feedback_tenant_isolation" ON aar_recipe_feedback;
CREATE POLICY "aar_recipe_feedback_tenant_isolation" ON aar_recipe_feedback
  FOR ALL USING (tenant_id = auth.uid());

-- updated_at trigger
DROP TRIGGER IF EXISTS set_aar_recipe_feedback_updated_at ON aar_recipe_feedback;
CREATE TRIGGER set_aar_recipe_feedback_updated_at
  BEFORE UPDATE ON aar_recipe_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- AAR Ingredient Issues: per-ingredient problems noted during after-action reviews
-- Tracks forgotten items, substitutions, quality issues linked to specific ingredients
-- (not just free-text forgotten items, but structured data tied to the ingredient master)

CREATE TABLE IF NOT EXISTS aar_ingredient_issues (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aar_id            UUID NOT NULL REFERENCES after_action_reviews(id) ON DELETE CASCADE,
  ingredient_id     UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  issue_type        TEXT NOT NULL CHECK (issue_type IN ('forgotten', 'substituted', 'quality', 'quantity_wrong', 'price_wrong')),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One issue per ingredient per AAR per type
CREATE UNIQUE INDEX IF NOT EXISTS idx_aar_ingredient_issues_unique ON aar_ingredient_issues(aar_id, ingredient_id, issue_type);
CREATE INDEX IF NOT EXISTS idx_aar_ingredient_issues_ingredient ON aar_ingredient_issues(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_aar_ingredient_issues_tenant ON aar_ingredient_issues(tenant_id);

-- RLS
ALTER TABLE aar_ingredient_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aar_ingredient_issues_tenant_isolation" ON aar_ingredient_issues;
CREATE POLICY "aar_ingredient_issues_tenant_isolation" ON aar_ingredient_issues
  FOR ALL USING (tenant_id = auth.uid());

-- updated_at trigger
DROP TRIGGER IF EXISTS set_aar_ingredient_issues_updated_at ON aar_ingredient_issues;
CREATE TRIGGER set_aar_ingredient_issues_updated_at
  BEFORE UPDATE ON aar_ingredient_issues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
