-- ChefTips: add title, category, source, event_id columns
-- Extends the existing chef_tips table with structured metadata

ALTER TABLE chef_tips ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE chef_tips ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other'
  CHECK (category IN ('technique', 'ingredient', 'equipment', 'plating', 'flavor', 'business', 'safety', 'other'));
ALTER TABLE chef_tips ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE chef_tips ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chef_tips_category ON chef_tips (chef_id, category);
CREATE INDEX IF NOT EXISTS idx_chef_tips_event ON chef_tips (event_id) WHERE event_id IS NOT NULL;
