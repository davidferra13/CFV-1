-- TakeAChef Phase 2: Lead likelihood tags + stagnancy index
-- Additive only — no drops, no deletes.

-- Chef's manual likelihood override (hot/warm/cold) for lead qualification
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS chef_likelihood TEXT
  CHECK (chef_likelihood IN ('hot', 'warm', 'cold'));

-- Index for stagnancy queries: untouched TakeAChef leads ordered by age
CREATE INDEX IF NOT EXISTS idx_inquiries_tac_stagnancy
  ON inquiries(tenant_id, status, channel, created_at)
  WHERE channel = 'take_a_chef' AND status = 'new';
