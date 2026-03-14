-- Add enabled_modules column to chef_preferences
-- Controls progressive disclosure: which nav modules the chef has toggled on/off.
-- This is independent of tier (Free vs Pro) — it controls what the chef SEES.
--
-- Default: core free modules only (dashboard, pipeline, events, clients, finance)
-- Grandfathered chefs get ALL modules set so nothing changes for them.

ALTER TABLE chef_preferences
ADD COLUMN IF NOT EXISTS enabled_modules TEXT[]
DEFAULT ARRAY['dashboard','pipeline','events','calendar','clients','finance'];
-- Backfill existing chefs: set ALL modules so existing users see no change.
-- New signups get the DEFAULT (core modules only) from the column default.
UPDATE chef_preferences
SET enabled_modules = ARRAY[
  'dashboard','pipeline','events','calendar','clients','finance',
  'protection','more'
]
WHERE enabled_modules IS NULL
   OR enabled_modules = ARRAY['dashboard','pipeline','events','calendar','clients','finance'];
