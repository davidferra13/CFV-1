-- Store Shopping Lists: organize grocery items by preferred store
-- Feature 1.8: Shopping List by Store

-- Chef's preferred stores
CREATE TABLE IF NOT EXISTS chef_preferred_stores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id     uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  store_name  text NOT NULL,
  store_type  text NOT NULL DEFAULT 'supermarket'
    CHECK (store_type IN (
      'supermarket', 'costco_wholesale', 'farmers_market', 'specialty',
      'butcher', 'fishmonger', 'bakery', 'international', 'online', 'other'
    )),
  address     text,
  notes       text,
  is_default  boolean DEFAULT false,
  sort_order  int DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(chef_id, store_name)
);

-- Item-to-store assignments (keyword-based lookup)
CREATE TABLE IF NOT EXISTS store_item_assignments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id            uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_keyword text NOT NULL,
  store_id           uuid NOT NULL REFERENCES chef_preferred_stores(id) ON DELETE CASCADE,
  reason             text CHECK (reason IS NULL OR reason IN (
    'best_price', 'best_quality', 'only_source', 'convenience'
  )),
  created_at         timestamptz DEFAULT now(),
  UNIQUE(chef_id, ingredient_keyword)
);

-- Indexes for common queries
CREATE INDEX idx_chef_preferred_stores_chef ON chef_preferred_stores(chef_id);
CREATE INDEX idx_store_item_assignments_chef ON store_item_assignments(chef_id);
CREATE INDEX idx_store_item_assignments_store ON store_item_assignments(store_id);
CREATE INDEX idx_store_item_assignments_keyword ON store_item_assignments(chef_id, ingredient_keyword);

-- RLS
ALTER TABLE chef_preferred_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_item_assignments ENABLE ROW LEVEL SECURITY;

-- Chef can manage their own stores
CREATE POLICY "chef_preferred_stores_select"
  ON chef_preferred_stores FOR SELECT
  USING (chef_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

CREATE POLICY "chef_preferred_stores_insert"
  ON chef_preferred_stores FOR INSERT
  WITH CHECK (chef_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

CREATE POLICY "chef_preferred_stores_update"
  ON chef_preferred_stores FOR UPDATE
  USING (chef_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

CREATE POLICY "chef_preferred_stores_delete"
  ON chef_preferred_stores FOR DELETE
  USING (chef_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

-- Chef can manage their own item assignments
CREATE POLICY "store_item_assignments_select"
  ON store_item_assignments FOR SELECT
  USING (chef_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

CREATE POLICY "store_item_assignments_insert"
  ON store_item_assignments FOR INSERT
  WITH CHECK (chef_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

CREATE POLICY "store_item_assignments_update"
  ON store_item_assignments FOR UPDATE
  USING (chef_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

CREATE POLICY "store_item_assignments_delete"
  ON store_item_assignments FOR DELETE
  USING (chef_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));
