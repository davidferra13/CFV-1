-- Rich Interaction Palette: delegate, save, note, follow_up
-- Adds columns to rail_item_state for new interaction types

ALTER TABLE rail_item_state ADD COLUMN IF NOT EXISTS delegated_to TEXT;
ALTER TABLE rail_item_state ADD COLUMN IF NOT EXISTS note_text TEXT;
ALTER TABLE rail_item_state ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ;
