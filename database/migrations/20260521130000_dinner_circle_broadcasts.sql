-- Dinner Circle Broadcasts
-- Mass reach-out / announcements from host or chef-delegated member to circle participants.
-- Respects notification prefs, quiet hours, and unsubscribe state.

CREATE TABLE IF NOT EXISTS public.dinner_circle_broadcasts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id        UUID NOT NULL REFERENCES public.hub_groups(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL,             -- profile_id of sender
  audience_type    TEXT NOT NULL DEFAULT 'all',
  -- 'all', 'missing_rsvp', 'missing_dietary', 'bring_list_assignees', 'custom'
  audience_filter  JSONB,                     -- for 'custom' audience
  message          TEXT NOT NULL,
  template_key     TEXT,                      -- optional template identifier
  channel          TEXT NOT NULL DEFAULT 'in_app',
  -- 'in_app', 'email', 'sms'
  scheduled_at     TIMESTAMPTZ,
  sent_at          TIMESTAMPTZ,
  cancelled_at     TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed')),
  error_message    TEXT,
  recipient_count  INTEGER,
  tenant_id        UUID NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dinner_circle_broadcast_deliveries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id      UUID NOT NULL REFERENCES public.dinner_circle_broadcasts(id) ON DELETE CASCADE,
  circle_id         UUID NOT NULL,            -- denormalized for tenant scoping
  recipient_id      UUID NOT NULL,            -- profile_id of recipient
  delivered_at      TIMESTAMPTZ,
  read_at           TIMESTAMPTZ,
  suppressed        BOOLEAN NOT NULL DEFAULT FALSE,
  suppression_reason TEXT,                   -- 'quiet_hours', 'unsubscribed', 'duplicate', 'opted_out'
  tenant_id         UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dcb_circle_id
  ON public.dinner_circle_broadcasts(circle_id);

CREATE INDEX IF NOT EXISTS idx_dcb_status
  ON public.dinner_circle_broadcasts(circle_id, status);

CREATE INDEX IF NOT EXISTS idx_dcb_scheduled
  ON public.dinner_circle_broadcasts(scheduled_at)
  WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dcb_tenant
  ON public.dinner_circle_broadcasts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_dcbd_broadcast_id
  ON public.dinner_circle_broadcast_deliveries(broadcast_id);

CREATE INDEX IF NOT EXISTS idx_dcbd_recipient
  ON public.dinner_circle_broadcast_deliveries(recipient_id, circle_id);

COMMENT ON TABLE public.dinner_circle_broadcasts IS
  'Mass reach-out messages from host/chef-delegated member to Dinner Circle participants. Audience-filtered, channel-aware, deduplication-enforced.';

COMMENT ON TABLE public.dinner_circle_broadcast_deliveries IS
  'Per-recipient delivery tracking for circle broadcasts. Tracks suppression, delivery, and read state.';
