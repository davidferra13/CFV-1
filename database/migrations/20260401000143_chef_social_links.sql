-- Add structured social links to chefs table.
-- JSONB allows flexible addition of new platforms without migrations.
-- Example value: {"instagram": "https://instagram.com/chefname", "tiktok": "https://tiktok.com/@chefname"}
ALTER TABLE chefs
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}';

COMMENT ON COLUMN chefs.social_links IS 'Chef social media links. Keys: instagram, tiktok, facebook, youtube, linktree. Values: full URLs.';
