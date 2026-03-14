-- Marketing Campaigns
-- Chef-composed email campaigns to client lists.
-- Supports re-engagement, seasonal announcements, and thank-you campaigns.
-- NOTE: Social media publishing (GAP 14A) is an API integration concern and
-- does not require a new migration — handled at the application layer.

-- ============================================
-- TABLE 1: MARKETING CAMPAIGNS
-- ============================================

CREATE TABLE marketing_campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id          UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  name             TEXT NOT NULL,
  campaign_type    TEXT NOT NULL DEFAULT 're_engagement'
                   CHECK (campaign_type IN (
                     're_engagement',
                     'seasonal',
                     'announcement',
                     'thank_you',
                     'promotion',
                     'other'
                   )),

  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),

  -- Audience definition (stored as JSONB for flexibility)
  -- e.g. { "segment": "dormant_90_days" } or { "client_ids": ["..."] }
  target_segment   JSONB NOT NULL DEFAULT '{}',

  subject          TEXT NOT NULL,
  body_html        TEXT NOT NULL,

  -- Scheduling
  scheduled_at     TIMESTAMPTZ,
  sent_at          TIMESTAMPTZ,
  recipient_count  INTEGER,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_campaigns_chef   ON marketing_campaigns(chef_id, status);
CREATE INDEX idx_campaigns_send   ON marketing_campaigns(scheduled_at) WHERE status = 'scheduled';
COMMENT ON TABLE marketing_campaigns IS 'Chef-composed email campaigns for client re-engagement and announcements.';
COMMENT ON COLUMN marketing_campaigns.target_segment IS 'JSONB audience definition. segment: dormant_90_days | all_clients | client_ids array.';
CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- TABLE 2: CAMPAIGN RECIPIENTS
-- ============================================

CREATE TABLE campaign_recipients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  chef_id          UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  client_id        UUID REFERENCES clients(id) ON DELETE SET NULL,
  email            TEXT NOT NULL,

  sent_at          TIMESTAMPTZ,
  opened_at        TIMESTAMPTZ,    -- tracked via email pixel (if Resend supports it)
  clicked_at       TIMESTAMPTZ,
  unsubscribed_at  TIMESTAMPTZ,

  error_message    TEXT,           -- delivery failure reason if any

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_client   ON campaign_recipients(chef_id, client_id);
COMMENT ON TABLE campaign_recipients IS 'Per-email delivery log for each campaign. Tracks open, click, and unsubscribe events.';
-- ============================================
-- UNSUBSCRIBE FLAG ON CLIENTS
-- ============================================

-- Add marketing opt-out to the clients table (additive ALTER TABLE)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS marketing_unsubscribed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS marketing_unsubscribed_at TIMESTAMPTZ;
COMMENT ON COLUMN clients.marketing_unsubscribed IS 'Client has opted out of marketing emails from this chef. Still receives transactional emails (quotes, contracts, etc.)';
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE marketing_campaigns  ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients  ENABLE ROW LEVEL SECURITY;
CREATE POLICY mc_chef_select ON marketing_campaigns FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY mc_chef_insert ON marketing_campaigns FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY mc_chef_update ON marketing_campaigns FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY mc_chef_delete ON marketing_campaigns FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cr_chef_select ON campaign_recipients FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cr_chef_insert ON campaign_recipients FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cr_chef_update ON campaign_recipients FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cr_chef_delete ON campaign_recipients FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
