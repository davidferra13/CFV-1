-- Hub Meal Board: persistent weekly meal calendar for dinner circles
-- Used by residency chefs to post daily meals (B/L/D) visible to the whole circle

CREATE TABLE hub_meal_board (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  author_profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id),

  -- When and what meal
  meal_date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),

  -- What's being served
  title TEXT NOT NULL,
  description TEXT,
  dietary_tags TEXT[] NOT NULL DEFAULT '{}',
  allergen_flags TEXT[] NOT NULL DEFAULT '{}',

  -- Optional link to existing menu/dish
  menu_id UUID REFERENCES menus(id) ON DELETE SET NULL,
  dish_id UUID REFERENCES dishes(id) ON DELETE SET NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'served', 'cancelled')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One entry per group + date + meal type
  UNIQUE(group_id, meal_date, meal_type)
);

CREATE INDEX idx_hub_meal_board_group_date ON hub_meal_board(group_id, meal_date);
CREATE INDEX idx_hub_meal_board_date_range ON hub_meal_board(meal_date) WHERE status != 'cancelled';
