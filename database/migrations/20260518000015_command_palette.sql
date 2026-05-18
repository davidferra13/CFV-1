-- Command Palette: search history for recent searches per chef
-- Tracks what chefs search for and what they select, powering
-- the "Recent" section in the command palette.

CREATE TABLE IF NOT EXISTS search_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id       uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  query         text NOT NULL,
  selected_result_type  text,
  selected_result_id    text,
  selected_result_label text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup for recent searches by chef, newest first
CREATE INDEX IF NOT EXISTS idx_search_history_chef_recent
  ON search_history (chef_id, created_at DESC);

-- Prevent unbounded growth: keep only last 200 per chef via a trigger
CREATE OR REPLACE FUNCTION prune_search_history() RETURNS trigger AS $$
BEGIN
  DELETE FROM search_history
  WHERE id IN (
    SELECT id FROM search_history
    WHERE chef_id = NEW.chef_id
    ORDER BY created_at DESC
    OFFSET 200
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prune_search_history ON search_history;
CREATE TRIGGER trg_prune_search_history
  AFTER INSERT ON search_history
  FOR EACH ROW
  EXECUTE FUNCTION prune_search_history();
