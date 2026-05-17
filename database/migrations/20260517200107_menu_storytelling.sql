CREATE TABLE IF NOT EXISTS menu_story_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  menu_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  dish_id UUID,
  sort_order INTEGER NOT NULL DEFAULT 0,
  foh_only BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_story_elements_menu ON menu_story_elements(tenant_id, menu_id);

CREATE TABLE IF NOT EXISTS menu_wine_pairings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  menu_id UUID NOT NULL,
  dish_id UUID,
  wine_name TEXT NOT NULL,
  vineyard TEXT,
  vintage TEXT,
  notes TEXT,
  price_per_bottle INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wine_pairings_menu ON menu_wine_pairings(tenant_id, menu_id);
ALTER TABLE menu_story_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_wine_pairings ENABLE ROW LEVEL SECURITY;
