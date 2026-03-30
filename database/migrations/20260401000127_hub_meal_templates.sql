-- Hub Meal Templates: saved weekly meal patterns for quick reuse
-- Chefs save a week as a named template and load it onto future weeks

CREATE TABLE hub_meal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  created_by_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id),

  name TEXT NOT NULL,
  description TEXT,

  -- Template data: array of meal entries (day offset from Monday + meal info)
  -- Format: [{ dayOffset: 0-6, mealType: 'breakfast'|'lunch'|'dinner', title: '...', description?: '...', dietaryTags?: [], allergenFlags?: [] }]
  entries JSONB NOT NULL DEFAULT '[]',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hub_meal_templates_group ON hub_meal_templates(group_id);
