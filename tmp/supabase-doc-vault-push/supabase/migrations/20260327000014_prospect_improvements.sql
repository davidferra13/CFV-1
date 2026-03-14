-- Prospecting Hub — Wave 4.1 Improvements
-- Adds previous_lead_score for score trending/delta arrows.

-- Previous lead score for trending (↑/↓ delta arrows)
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS previous_lead_score integer DEFAULT 0;
