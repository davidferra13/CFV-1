-- Tasting Menu Builder (Feature 6.2)
-- Multi-course tasting menu builder with course progression and wine/beverage pairings

-- ─── tasting_menus ──────────────────────────────────────────────────────────────

CREATE TABLE tasting_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  course_count int NOT NULL DEFAULT 5,
  price_per_person_cents int,
  wine_pairing_upcharge_cents int DEFAULT 0,
  occasion text,
  season text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasting_menus_chef_id ON tasting_menus(chef_id);

ALTER TABLE tasting_menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chefs manage own tasting menus"
  ON tasting_menus FOR ALL
  USING (chef_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.auth_user_id = auth.uid()
        AND user_roles.entity_id = tasting_menus.chef_id
        AND user_roles.role = 'chef'
    ))
  WITH CHECK (chef_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.auth_user_id = auth.uid()
        AND user_roles.entity_id = tasting_menus.chef_id
        AND user_roles.role = 'chef'
    ));

-- ─── tasting_menu_courses ───────────────────────────────────────────────────────

CREATE TABLE tasting_menu_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tasting_menu_id uuid NOT NULL REFERENCES tasting_menus(id) ON DELETE CASCADE,
  course_number int NOT NULL,
  course_type text NOT NULL CHECK (course_type IN (
    'amuse_bouche', 'appetizer', 'soup', 'salad', 'fish',
    'intermezzo', 'main', 'cheese', 'pre_dessert', 'dessert', 'mignardise'
  )),
  dish_name text NOT NULL,
  description text,
  recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  wine_pairing text,
  pairing_notes text,
  portion_size text CHECK (portion_size IN ('bite', 'small', 'standard')),
  prep_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tasting_menu_id, course_number)
);

CREATE INDEX idx_tasting_menu_courses_menu_id ON tasting_menu_courses(tasting_menu_id);
CREATE INDEX idx_tasting_menu_courses_recipe_id ON tasting_menu_courses(recipe_id) WHERE recipe_id IS NOT NULL;

ALTER TABLE tasting_menu_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chefs manage own tasting menu courses"
  ON tasting_menu_courses FOR ALL
  USING (EXISTS (
    SELECT 1 FROM tasting_menus tm
    JOIN user_roles ur ON ur.entity_id = tm.chef_id AND ur.role = 'chef'
    WHERE tm.id = tasting_menu_courses.tasting_menu_id
      AND ur.auth_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasting_menus tm
    JOIN user_roles ur ON ur.entity_id = tm.chef_id AND ur.role = 'chef'
    WHERE tm.id = tasting_menu_courses.tasting_menu_id
      AND ur.auth_user_id = auth.uid()
  ));
