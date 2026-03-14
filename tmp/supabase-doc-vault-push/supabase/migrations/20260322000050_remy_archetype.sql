-- Add remy_archetype column to ai_preferences
-- Lets chefs choose a personality archetype for Remy (veteran, hype, zen, numbers, mentor, classic)
-- Default is NULL which maps to 'veteran' in application code.

ALTER TABLE ai_preferences
ADD COLUMN IF NOT EXISTS remy_archetype TEXT DEFAULT NULL;
COMMENT ON COLUMN ai_preferences.remy_archetype IS 'Remy personality archetype: veteran, hype, zen, numbers, mentor, classic. NULL = veteran (default).';
