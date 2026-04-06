-- Ingredient Alias Pending State
-- Allow confirmed_at to be NULL so auto-matches can be "pending" until the chef reviews them.
-- Previously, confirmed_at was NOT NULL DEFAULT now(), which meant every auto-match was
-- silently treated as confirmed without chef review. This caused wrong matches to go
-- undetected (e.g., "Butter" matched to "Cocoa Butter", "Shrimp" to "Shrimp Paste").
--
-- After this migration:
--   confirmed_at IS NOT NULL = chef has reviewed and approved
--   confirmed_at IS NULL + system_ingredient_id IS NOT NULL = pending auto-match, needs review
--   match_method = 'dismissed' = chef said "none of these"

ALTER TABLE ingredient_aliases
  ALTER COLUMN confirmed_at DROP NOT NULL,
  ALTER COLUMN confirmed_at DROP DEFAULT;

-- Also add 'semantic' to the match_method check constraint (used by OpenClaw sync)
ALTER TABLE ingredient_aliases DROP CONSTRAINT IF EXISTS ingredient_aliases_match_method_check;
ALTER TABLE ingredient_aliases ADD CONSTRAINT ingredient_aliases_match_method_check
  CHECK (match_method IN ('manual', 'trigram', 'exact', 'dismissed', 'semantic'));
