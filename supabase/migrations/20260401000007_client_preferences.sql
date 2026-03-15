-- Client Preference History
-- Tracks liked/disliked dishes, ingredients, cuisines, and techniques per client.
-- Builds a cumulative taste profile over time (SevenRooms pattern).

-- Create the rating enum
CREATE TYPE client_preference_rating AS ENUM ('loved', 'liked', 'neutral', 'disliked');

-- Create the item type enum
CREATE TYPE client_preference_item_type AS ENUM ('dish', 'ingredient', 'cuisine', 'technique');

CREATE TABLE client_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  item_type client_preference_item_type NOT NULL,
  item_name TEXT NOT NULL,
  item_id UUID,  -- optional FK to recipes/ingredients if applicable
  rating client_preference_rating NOT NULL DEFAULT 'neutral',
  notes TEXT,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_client_preferences_tenant ON client_preferences(tenant_id);
CREATE INDEX idx_client_preferences_client ON client_preferences(client_id);
CREATE INDEX idx_client_preferences_item_type ON client_preferences(item_type);
CREATE INDEX idx_client_preferences_rating ON client_preferences(rating);
CREATE INDEX idx_client_preferences_client_type ON client_preferences(client_id, item_type);

-- RLS
ALTER TABLE client_preferences ENABLE ROW LEVEL SECURITY;

-- Chef can read their own tenant's preferences
CREATE POLICY "chef_read_own_preferences"
  ON client_preferences FOR SELECT
  USING (tenant_id = auth.uid());

-- Chef can insert preferences for their own tenant
CREATE POLICY "chef_insert_own_preferences"
  ON client_preferences FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

-- Chef can update their own tenant's preferences
CREATE POLICY "chef_update_own_preferences"
  ON client_preferences FOR UPDATE
  USING (tenant_id = auth.uid());

-- Chef can delete their own tenant's preferences
CREATE POLICY "chef_delete_own_preferences"
  ON client_preferences FOR DELETE
  USING (tenant_id = auth.uid());
