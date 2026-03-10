-- Outreach Tracking Tables
-- Supports recurring client outreach automation and post-event referral request sequences.
-- Two tables: client_outreach_log (re-engagement tracking) and referral_request_log (referral asks).

-- ─── Client Outreach Log ────────────────────────────────────────────────────
-- Tracks when a chef reaches out to at-risk/dormant clients to prevent spam.

CREATE TABLE IF NOT EXISTS client_outreach_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  method      text NOT NULL CHECK (method IN ('email', 'sms', 'call')),
  sent_at     timestamptz NOT NULL DEFAULT now(),
  sent_by     uuid,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_outreach_log_tenant_client ON client_outreach_log(tenant_id, client_id);
CREATE INDEX idx_outreach_log_sent_at ON client_outreach_log(sent_at DESC);

ALTER TABLE client_outreach_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chefs can manage their outreach log"
  ON client_outreach_log
  FOR ALL
  USING (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

-- ─── Referral Request Log ───────────────────────────────────────────────────
-- Tracks when a referral ask is sent to a client after a successful event.

CREATE TABLE IF NOT EXISTS referral_request_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_id    uuid REFERENCES events(id) ON DELETE SET NULL,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'clicked', 'converted')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_referral_req_tenant_client ON referral_request_log(tenant_id, client_id);
CREATE INDEX idx_referral_req_sent_at ON referral_request_log(sent_at DESC);

ALTER TABLE referral_request_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chefs can manage their referral request log"
  ON referral_request_log
  FOR ALL
  USING (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));
