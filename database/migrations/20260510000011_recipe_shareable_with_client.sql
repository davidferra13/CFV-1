-- Add shareable_with_client flag to recipes table
-- Allows chefs to mark specific recipes as visible to their clients in post-event summaries

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS shareable_with_client BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_recipes_shareable ON recipes(tenant_id, shareable_with_client) WHERE shareable_with_client = true;
