-- Recipe Lifecycle Columns
-- Adds status tracking, version lineage, and archival support to the recipes table.
-- Purely additive. No existing columns modified or removed.
--
-- status: controls recipe visibility and usability across menus and prep sheets.
-- forked_from_id: links a recipe to the original it was derived from (version lineage).
-- version_number: increments on each fork; the root recipe is always version 1.
-- archived_at: timestamp for soft-delete audit trail.

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
  CHECK (status IN ('stub', 'draft', 'active', 'archived'));

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS forked_from_id UUID REFERENCES recipes(id) ON DELETE SET NULL;

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS version_note TEXT;

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1;

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Partial index: only recipes that are forks
CREATE INDEX IF NOT EXISTS idx_recipes_forked_from
  ON recipes(forked_from_id)
  WHERE forked_from_id IS NOT NULL;

-- Composite index: tenant + status for filtered listing queries
CREATE INDEX IF NOT EXISTS idx_recipes_status
  ON recipes(tenant_id, status);
