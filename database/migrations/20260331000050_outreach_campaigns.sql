-- Outreach Campaigns & Prospect Pipeline Extensions
-- Supports automated prospecting pipeline: n8n scraping -> Ollama personalization -> Instantly.ai delivery
-- Tracks campaign stats, email delivery events, and reply ingestion back into ChefFlow.

-- ── Outreach Campaigns Table ──────────────────────────────────────────────────
-- Links ChefFlow prospects to Instantly.ai campaigns for tracking delivery metrics.

CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  instantly_campaign_id text,
  name                  text NOT NULL,
  status                text NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'warming', 'active', 'paused', 'completed')),
  email_account         text,
  domain                text,
  leads_count           integer NOT NULL DEFAULT 0,
  sent_count            integer NOT NULL DEFAULT 0,
  open_count            integer NOT NULL DEFAULT 0,
  reply_count           integer NOT NULL DEFAULT 0,
  bounce_count          integer NOT NULL DEFAULT 0,
  meeting_count         integer NOT NULL DEFAULT 0,
  converted_count       integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_chef ON outreach_campaigns(chef_id);
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_status ON outreach_campaigns(chef_id, status);
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_instantly ON outreach_campaigns(instantly_campaign_id) WHERE instantly_campaign_id IS NOT NULL;

ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chefs manage own outreach campaigns" ON outreach_campaigns;
CREATE POLICY "Chefs manage own outreach campaigns"
  ON outreach_campaigns FOR ALL
  USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

-- ── Prospect Table Extensions ─────────────────────────────────────────────────
-- Add columns for Instantly integration and email delivery tracking.

DO $$
BEGIN
  -- Link prospect to an outreach campaign
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prospects' AND column_name = 'outreach_campaign_id') THEN
    ALTER TABLE prospects ADD COLUMN IF NOT EXISTS outreach_campaign_id uuid REFERENCES outreach_campaigns(id) ON DELETE SET NULL;
  END IF;

  -- Instantly's internal lead ID for API sync
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prospects' AND column_name = 'instantly_lead_id') THEN
    ALTER TABLE prospects ADD COLUMN instantly_lead_id text;
  END IF;

  -- Email delivery tracking timestamps
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prospects' AND column_name = 'email_sent_at') THEN
    ALTER TABLE prospects ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prospects' AND column_name = 'email_opened_at') THEN
    ALTER TABLE prospects ADD COLUMN IF NOT EXISTS email_opened_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prospects' AND column_name = 'reply_received_at') THEN
    ALTER TABLE prospects ADD COLUMN IF NOT EXISTS reply_received_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prospects' AND column_name = 'reply_sentiment') THEN
    ALTER TABLE prospects ADD COLUMN IF NOT EXISTS reply_sentiment text CHECK (reply_sentiment IN ('interested', 'not_interested', 'unknown'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prospects' AND column_name = 'reply_text') THEN
    ALTER TABLE prospects ADD COLUMN IF NOT EXISTS reply_text text;
  END IF;
END $$;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_prospects_campaign ON prospects(outreach_campaign_id) WHERE outreach_campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prospects_instantly ON prospects(instantly_lead_id) WHERE instantly_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prospects_email_sent ON prospects(chef_id, email_sent_at) WHERE email_sent_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prospects_reply ON prospects(chef_id, reply_received_at) WHERE reply_received_at IS NOT NULL;
