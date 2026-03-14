-- Campaign System V2
-- Adds: campaign_templates (reusable drafts), direct_outreach_log (1:1 sends),
--       resend_message_id on campaign_recipients (for open/click webhook matching).

-- ============================================
-- 1. RESEND MESSAGE ID on campaign_recipients
-- ============================================
-- Required for Resend webhooks to match open/click events back to recipients.

ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS resend_message_id TEXT;
CREATE INDEX IF NOT EXISTS idx_cr_resend_id ON campaign_recipients(resend_message_id) WHERE resend_message_id IS NOT NULL;

COMMENT ON COLUMN campaign_recipients.resend_message_id IS 'Resend email ID returned at send time. Used to match open/click webhook events.';

-- ============================================
-- 2. CAMPAIGN TEMPLATES
-- ============================================
-- Reusable message templates. System templates (is_system=true) are seeded by the app.
-- Chefs can also save their own templates from sent campaigns.

CREATE TABLE campaign_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  name          TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 're_engagement'
                CHECK (campaign_type IN (
                  're_engagement', 'seasonal', 'announcement',
                  'thank_you', 'promotion', 'other'
                )),

  subject       TEXT NOT NULL,
  body_html     TEXT NOT NULL,

  -- System templates are pre-seeded and shared across chefs.
  -- Chef-created templates are private (chef_id scoped).
  is_system     BOOLEAN NOT NULL DEFAULT false,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_templates_chef ON campaign_templates(chef_id, is_system);

CREATE TRIGGER trg_campaign_templates_updated_at
  BEFORE UPDATE ON campaign_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE campaign_templates IS 'Reusable campaign message templates. is_system=true are app-seeded starters.';

-- ============================================
-- 3. DIRECT OUTREACH LOG
-- ============================================
-- Tracks 1:1 messages sent from client profile pages.
-- Covers all channels: email, SMS, call notes, Instagram notes.

CREATE TABLE direct_outreach_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id     UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  channel     TEXT NOT NULL
              CHECK (channel IN ('email', 'sms', 'call_note', 'instagram_note')),

  subject     TEXT,           -- email only
  body        TEXT NOT NULL,

  -- Delivery result for digital channels
  delivered   BOOLEAN,        -- null = not applicable (call_note, instagram_note)
  error_msg   TEXT,

  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_direct_outreach_chef    ON direct_outreach_log(chef_id, sent_at DESC);
CREATE INDEX idx_direct_outreach_client  ON direct_outreach_log(client_id, sent_at DESC);

COMMENT ON TABLE direct_outreach_log IS 'Per-client 1:1 outreach history. Covers email, SMS, call notes, and Instagram notes.';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE campaign_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_outreach_log  ENABLE ROW LEVEL SECURITY;

-- Campaign templates: chef sees own templates + system templates
CREATE POLICY ct_chef_select ON campaign_templates FOR SELECT
  USING (get_current_user_role() = 'chef' AND (is_system = true OR chef_id = get_current_tenant_id()));

CREATE POLICY ct_chef_insert ON campaign_templates FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id() AND is_system = false);

CREATE POLICY ct_chef_update ON campaign_templates FOR UPDATE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id() AND is_system = false);

CREATE POLICY ct_chef_delete ON campaign_templates FOR DELETE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id() AND is_system = false);

-- Direct outreach log: chef sees own entries
CREATE POLICY dol_chef_select ON direct_outreach_log FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

CREATE POLICY dol_chef_insert ON direct_outreach_log FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
