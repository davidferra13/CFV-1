-- Quality Sourcing Tracker: track ingredient sourcing for quality and sustainability reporting
-- Enables local/organic sourcing percentages, food miles, waste reduction metrics

CREATE TABLE sourcing_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id      uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id     uuid REFERENCES events(id) ON DELETE SET NULL,
  entry_date   date NOT NULL DEFAULT CURRENT_DATE,
  ingredient_name text NOT NULL,
  source_type  text NOT NULL CHECK (source_type IN (
    'local_farm', 'farmers_market', 'organic', 'conventional',
    'imported', 'foraged', 'garden', 'specialty'
  )),
  source_name  text,
  distance_miles int,
  cost_cents   int,
  weight_lbs   numeric,
  is_organic   boolean DEFAULT false,
  is_local     boolean DEFAULT false,
  notes        text,
  created_at   timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_sourcing_entries_chef_id ON sourcing_entries(chef_id);
CREATE INDEX idx_sourcing_entries_entry_date ON sourcing_entries(chef_id, entry_date);
CREATE INDEX idx_sourcing_entries_event_id ON sourcing_entries(event_id);

-- RLS: chef can only see their own entries
ALTER TABLE sourcing_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY sourcing_entries_chef_select
  ON sourcing_entries FOR SELECT
  USING (chef_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

CREATE POLICY sourcing_entries_chef_insert
  ON sourcing_entries FOR INSERT
  WITH CHECK (chef_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

CREATE POLICY sourcing_entries_chef_update
  ON sourcing_entries FOR UPDATE
  USING (chef_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));

CREATE POLICY sourcing_entries_chef_delete
  ON sourcing_entries FOR DELETE
  USING (chef_id IN (
    SELECT entity_id FROM user_roles
    WHERE auth_user_id = auth.uid() AND role = 'chef'
  ));
