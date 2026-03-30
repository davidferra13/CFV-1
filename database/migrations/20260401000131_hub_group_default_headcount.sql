-- Default head count for the group (household size)
-- Used when individual meal head_count is NULL

ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS default_head_count INTEGER DEFAULT NULL;
