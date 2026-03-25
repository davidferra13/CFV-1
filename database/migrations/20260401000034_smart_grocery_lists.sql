-- Smart Grocery Lists
-- Editable, reorderable grocery lists grouped by aisle/section with smart features.

-- ============================================
-- smart_grocery_lists: top-level grocery list
-- ============================================
CREATE TABLE IF NOT EXISTS smart_grocery_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name text NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_smart_grocery_lists_chef_id ON smart_grocery_lists(chef_id);
CREATE INDEX IF NOT EXISTS idx_smart_grocery_lists_event_id ON smart_grocery_lists(event_id) WHERE event_id IS NOT NULL;

-- ============================================
-- smart_grocery_items: line items on a list
-- ============================================
CREATE TABLE IF NOT EXISTS smart_grocery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES smart_grocery_lists(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text,
  aisle_section text DEFAULT 'other' CHECK (aisle_section IN (
    'produce', 'meat_seafood', 'dairy_eggs', 'bakery', 'frozen',
    'pantry_dry', 'canned', 'condiments_sauces', 'spices', 'beverages',
    'deli', 'bulk', 'international', 'baking', 'snacks', 'household', 'other'
  )),
  is_checked boolean NOT NULL DEFAULT false,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  price_estimate_cents int
);

CREATE INDEX IF NOT EXISTS idx_smart_grocery_items_list_id ON smart_grocery_items(list_id);

-- ============================================
-- aisle_preferences: chef's learned aisle mappings per store
-- ============================================
CREATE TABLE IF NOT EXISTS aisle_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  item_keyword text NOT NULL,
  aisle_section text NOT NULL CHECK (aisle_section IN (
    'produce', 'meat_seafood', 'dairy_eggs', 'bakery', 'frozen',
    'pantry_dry', 'canned', 'condiments_sauces', 'spices', 'beverages',
    'deli', 'bulk', 'international', 'baking', 'snacks', 'household', 'other'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(chef_id, store_name, item_keyword)
);

CREATE INDEX IF NOT EXISTS idx_aisle_preferences_chef_id ON aisle_preferences(chef_id);

-- ============================================
-- RLS policies
-- ============================================
ALTER TABLE smart_grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_grocery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE aisle_preferences ENABLE ROW LEVEL SECURITY;

-- smart_grocery_lists: chef can CRUD own lists
DROP POLICY IF EXISTS smart_grocery_lists_select ON smart_grocery_lists;
CREATE POLICY smart_grocery_lists_select ON smart_grocery_lists
  FOR SELECT USING (chef_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1));
DROP POLICY IF EXISTS smart_grocery_lists_insert ON smart_grocery_lists;
CREATE POLICY smart_grocery_lists_insert ON smart_grocery_lists
  FOR INSERT WITH CHECK (chef_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1));
DROP POLICY IF EXISTS smart_grocery_lists_update ON smart_grocery_lists;
CREATE POLICY smart_grocery_lists_update ON smart_grocery_lists
  FOR UPDATE USING (chef_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1));
DROP POLICY IF EXISTS smart_grocery_lists_delete ON smart_grocery_lists;
CREATE POLICY smart_grocery_lists_delete ON smart_grocery_lists
  FOR DELETE USING (chef_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1));

-- smart_grocery_items: access via list ownership
DROP POLICY IF EXISTS smart_grocery_items_select ON smart_grocery_items;
CREATE POLICY smart_grocery_items_select ON smart_grocery_items
  FOR SELECT USING (list_id IN (SELECT id FROM smart_grocery_lists WHERE chef_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1)));
DROP POLICY IF EXISTS smart_grocery_items_insert ON smart_grocery_items;
CREATE POLICY smart_grocery_items_insert ON smart_grocery_items
  FOR INSERT WITH CHECK (list_id IN (SELECT id FROM smart_grocery_lists WHERE chef_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1)));
DROP POLICY IF EXISTS smart_grocery_items_update ON smart_grocery_items;
CREATE POLICY smart_grocery_items_update ON smart_grocery_items
  FOR UPDATE USING (list_id IN (SELECT id FROM smart_grocery_lists WHERE chef_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1)));
DROP POLICY IF EXISTS smart_grocery_items_delete ON smart_grocery_items;
CREATE POLICY smart_grocery_items_delete ON smart_grocery_items
  FOR DELETE USING (list_id IN (SELECT id FROM smart_grocery_lists WHERE chef_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1)));

-- aisle_preferences: chef can CRUD own preferences
DROP POLICY IF EXISTS aisle_preferences_select ON aisle_preferences;
CREATE POLICY aisle_preferences_select ON aisle_preferences
  FOR SELECT USING (chef_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1));
DROP POLICY IF EXISTS aisle_preferences_insert ON aisle_preferences;
CREATE POLICY aisle_preferences_insert ON aisle_preferences
  FOR INSERT WITH CHECK (chef_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1));
DROP POLICY IF EXISTS aisle_preferences_update ON aisle_preferences;
CREATE POLICY aisle_preferences_update ON aisle_preferences
  FOR UPDATE USING (chef_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1));
DROP POLICY IF EXISTS aisle_preferences_delete ON aisle_preferences;
CREATE POLICY aisle_preferences_delete ON aisle_preferences
  FOR DELETE USING (chef_id = (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1));
