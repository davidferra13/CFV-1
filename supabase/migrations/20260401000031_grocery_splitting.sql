-- Migration: Multi-Client Grocery Splitting
-- Adds tables for tracking grocery trips, line items, and per-client cost splits.

-- ============================================
-- grocery_trips: one shopping trip
-- ============================================
CREATE TABLE grocery_trips (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id     uuid NOT NULL REFERENCES chefs(id),
  store_name  text,
  trip_date   date NOT NULL DEFAULT CURRENT_DATE,
  total_cents int  NOT NULL DEFAULT 0,
  notes       text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE grocery_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_own_trips"
  ON grocery_trips FOR ALL
  USING (chef_id = auth.uid())
  WITH CHECK (chef_id = auth.uid());

CREATE INDEX idx_grocery_trips_chef ON grocery_trips(chef_id);
CREATE INDEX idx_grocery_trips_date ON grocery_trips(chef_id, trip_date);

-- ============================================
-- grocery_trip_items: individual line items
-- ============================================
CREATE TABLE grocery_trip_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid NOT NULL REFERENCES grocery_trips(id) ON DELETE CASCADE,
  item_name   text NOT NULL,
  quantity    numeric NOT NULL DEFAULT 1,
  unit        text,
  price_cents int NOT NULL,
  category    text CHECK (category IN (
    'produce', 'protein', 'dairy', 'pantry',
    'frozen', 'bakery', 'beverage', 'other'
  ))
);

ALTER TABLE grocery_trip_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_own_trip_items"
  ON grocery_trip_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM grocery_trips
      WHERE grocery_trips.id = grocery_trip_items.trip_id
        AND grocery_trips.chef_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM grocery_trips
      WHERE grocery_trips.id = grocery_trip_items.trip_id
        AND grocery_trips.chef_id = auth.uid()
    )
  );

CREATE INDEX idx_trip_items_trip ON grocery_trip_items(trip_id);

-- ============================================
-- grocery_trip_splits: how costs are divided
-- ============================================
CREATE TABLE grocery_trip_splits (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      uuid NOT NULL REFERENCES grocery_trips(id) ON DELETE CASCADE,
  item_id      uuid REFERENCES grocery_trip_items(id) ON DELETE CASCADE,
  client_id    uuid NOT NULL REFERENCES clients(id),
  event_id     uuid REFERENCES events(id),
  amount_cents int  NOT NULL,
  split_method text CHECK (split_method IN (
    'manual', 'proportional', 'equal', 'full'
  ))
);

ALTER TABLE grocery_trip_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_own_trip_splits"
  ON grocery_trip_splits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM grocery_trips
      WHERE grocery_trips.id = grocery_trip_splits.trip_id
        AND grocery_trips.chef_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM grocery_trips
      WHERE grocery_trips.id = grocery_trip_splits.trip_id
        AND grocery_trips.chef_id = auth.uid()
    )
  );

CREATE INDEX idx_trip_splits_trip ON grocery_trip_splits(trip_id);
CREATE INDEX idx_trip_splits_client ON grocery_trip_splits(client_id);
