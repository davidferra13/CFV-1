-- Guest Experience Improvements (All Phases)
-- Adds tables for: guest feedback, guest-to-chef messages, day-of reminders,
-- dietary confirmation follow-ups, guest document sharing, attendance reconciliation,
-- and pre-event experience page content.
--
-- SAFE: Additive only. No existing tables dropped or columns removed.

-- ============================================================
-- 1) guest_feedback
-- Post-event satisfaction survey for individual guests (not clients).
-- Token-gated, same pattern as event_surveys.
-- ============================================================

CREATE TABLE IF NOT EXISTS guest_feedback (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id              UUID NOT NULL REFERENCES event_guests(id) ON DELETE CASCADE,
  token                 UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

  -- Ratings (1-5 stars), optional until submitted
  overall_rating        SMALLINT CHECK (overall_rating BETWEEN 1 AND 5),
  food_rating           SMALLINT CHECK (food_rating BETWEEN 1 AND 5),
  experience_rating     SMALLINT CHECK (experience_rating BETWEEN 1 AND 5),

  -- Text responses
  highlight_text        TEXT,
  suggestion_text       TEXT,
  testimonial_consent   BOOLEAN NOT NULL DEFAULT FALSE,

  -- Lifecycle
  sent_at               TIMESTAMPTZ,
  submitted_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT guest_feedback_one_per_guest_event UNIQUE (guest_id, event_id)
);
COMMENT ON TABLE guest_feedback IS
  'Post-event guest satisfaction feedback. One per guest per event. '
  'Created when event completes, sent via token link. submitted_at = NULL means pending.';
CREATE INDEX IF NOT EXISTS idx_guest_feedback_tenant ON guest_feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guest_feedback_event ON guest_feedback(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_feedback_token ON guest_feedback(token);
CREATE INDEX IF NOT EXISTS idx_guest_feedback_guest ON guest_feedback(guest_id);
ALTER TABLE guest_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY guest_feedback_chef_read ON guest_feedback
  FOR SELECT TO authenticated
  USING (
    tenant_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
      LIMIT 1
    )
  );
-- Public access for token-based submission handled via admin client in server actions.

-- ============================================================
-- 2) guest_messages
-- One-way messages from guests to chef, sent from the RSVP portal.
-- Chef sees these on the event detail guest panel.
-- ============================================================

CREATE TABLE IF NOT EXISTS guest_messages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id              UUID NOT NULL REFERENCES event_guests(id) ON DELETE CASCADE,
  guest_token           TEXT NOT NULL,
  message               TEXT NOT NULL CHECK (length(message) <= 2000),
  read_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE guest_messages IS
  'One-way messages from event guests to the chef, sent via the RSVP portal. '
  'Chef sees in event detail. Max 2000 chars per message.';
CREATE INDEX IF NOT EXISTS idx_guest_messages_tenant ON guest_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guest_messages_event ON guest_messages(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_messages_guest ON guest_messages(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_messages_unread ON guest_messages(event_id) WHERE read_at IS NULL;
ALTER TABLE guest_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY guest_messages_chef_all ON guest_messages
  FOR ALL TO authenticated
  USING (
    tenant_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
      LIMIT 1
    )
  );
-- Public inserts handled via admin client with token validation.
CREATE POLICY guest_messages_public_insert ON guest_messages
  FOR INSERT WITH CHECK (true);
GRANT INSERT ON guest_messages TO anon;
-- ============================================================
-- 3) guest_day_of_reminders
-- Tracks "your event is tomorrow" reminder delivery to confirmed guests.
-- ============================================================

CREATE TABLE IF NOT EXISTS guest_day_of_reminders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id              UUID NOT NULL REFERENCES event_guests(id) ON DELETE CASCADE,
  reminder_type         TEXT NOT NULL CHECK (reminder_type IN ('day_before', 'day_of', 'custom')),
  recipient_email       TEXT,
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  sent_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT guest_day_of_unique UNIQUE (guest_id, event_id, reminder_type)
);
CREATE INDEX IF NOT EXISTS idx_guest_day_of_reminders_event ON guest_day_of_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_day_of_reminders_tenant ON guest_day_of_reminders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guest_day_of_reminders_status ON guest_day_of_reminders(status) WHERE status = 'pending';
ALTER TABLE guest_day_of_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY guest_day_of_reminders_chef_all ON guest_day_of_reminders
  FOR ALL TO authenticated
  USING (
    tenant_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
      LIMIT 1
    )
  );
-- ============================================================
-- 4) guest_dietary_confirmations
-- Tracks 48-72hr pre-event dietary confirmation sends and responses.
-- ============================================================

CREATE TABLE IF NOT EXISTS guest_dietary_confirmations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id              UUID NOT NULL REFERENCES event_guests(id) ON DELETE CASCADE,
  dietary_summary       TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'confirmed', 'updated', 'failed')),
  sent_at               TIMESTAMPTZ,
  responded_at          TIMESTAMPTZ,
  response_note         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT guest_dietary_confirm_unique UNIQUE (guest_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_guest_dietary_confirmations_event ON guest_dietary_confirmations(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_dietary_confirmations_tenant ON guest_dietary_confirmations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guest_dietary_confirmations_status ON guest_dietary_confirmations(status);
ALTER TABLE guest_dietary_confirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY guest_dietary_confirmations_chef_all ON guest_dietary_confirmations
  FOR ALL TO authenticated
  USING (
    tenant_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
      LIMIT 1
    )
  );
-- ============================================================
-- 5) event_guest_documents
-- Chef-uploaded documents shared with guests (post-event recipe cards,
-- wine pairings, event photos, pre-event info).
-- ============================================================

CREATE TABLE IF NOT EXISTS event_guest_documents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  description           TEXT,
  document_type         TEXT NOT NULL CHECK (
    document_type IN ('recipe_card', 'wine_pairing', 'event_photos', 'pre_event_info', 'thank_you', 'other')
  ),
  file_url              TEXT,
  content_text          TEXT,
  is_pre_event          BOOLEAN NOT NULL DEFAULT false,
  published_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE event_guest_documents IS
  'Documents shared with event guests. Pre-event docs (is_pre_event=true) show on the '
  'countdown page. Post-event docs show in the thank-you package.';
CREATE INDEX IF NOT EXISTS idx_event_guest_documents_event ON event_guest_documents(event_id);
CREATE INDEX IF NOT EXISTS idx_event_guest_documents_tenant ON event_guest_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_guest_documents_type ON event_guest_documents(document_type);
DROP TRIGGER IF EXISTS set_event_guest_documents_updated_at ON event_guest_documents;
CREATE TRIGGER set_event_guest_documents_updated_at
  BEFORE UPDATE ON event_guest_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE event_guest_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY event_guest_documents_chef_all ON event_guest_documents
  FOR ALL TO authenticated
  USING (
    tenant_id = (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
      LIMIT 1
    )
  );
-- Public read for token-validated access (app layer enforces token check)
CREATE POLICY event_guest_documents_public_read ON event_guest_documents
  FOR SELECT USING (true);
GRANT SELECT ON event_guest_documents TO anon;
-- ============================================================
-- 6) Additive columns on event_guests
-- actual_attended: post-event reconciliation (chef marks attendance)
-- about_me: optional guest bio for social features
-- ============================================================

ALTER TABLE event_guests
  ADD COLUMN IF NOT EXISTS actual_attended TEXT CHECK (
    actual_attended IN ('attended', 'no_show', 'late', 'left_early')
  ),
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS about_me TEXT CHECK (length(about_me) <= 500);
-- ============================================================
-- 7) Additive column on event_shares for pre-event content
-- Chef customizes what guests see on the countdown page.
-- ============================================================

ALTER TABLE event_shares
  ADD COLUMN IF NOT EXISTS pre_event_content JSONB NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN event_shares.pre_event_content IS
  'Chef-customized content for the pre-event countdown page. '
  'Keys: parking_info, dress_code, what_to_expect, arrival_instructions, custom_message.';
-- ============================================================
-- 8) Additive column on event_shares for day-of reminders toggle
-- ============================================================

ALTER TABLE event_shares
  ADD COLUMN IF NOT EXISTS day_of_reminders_enabled BOOLEAN NOT NULL DEFAULT true;
-- ============================================================
-- 9) View: guest_feedback_summary
-- Aggregated feedback ratings per event for chef dashboard.
-- ============================================================

CREATE OR REPLACE VIEW guest_feedback_summary AS
SELECT
  gf.event_id,
  gf.tenant_id,
  COUNT(*) FILTER (WHERE gf.submitted_at IS NOT NULL)::int AS submitted_count,
  COUNT(*) FILTER (WHERE gf.submitted_at IS NULL AND gf.sent_at IS NOT NULL)::int AS pending_count,
  COUNT(*)::int AS total_sent,
  ROUND(AVG(gf.overall_rating) FILTER (WHERE gf.submitted_at IS NOT NULL), 2) AS avg_overall,
  ROUND(AVG(gf.food_rating) FILTER (WHERE gf.submitted_at IS NOT NULL), 2) AS avg_food,
  ROUND(AVG(gf.experience_rating) FILTER (WHERE gf.submitted_at IS NOT NULL), 2) AS avg_experience,
  COUNT(*) FILTER (WHERE gf.testimonial_consent = true)::int AS testimonial_count
FROM guest_feedback gf
GROUP BY gf.event_id, gf.tenant_id;
GRANT SELECT ON guest_feedback_summary TO authenticated;
