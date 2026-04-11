-- AI Calls System
-- Universal call log for all AI-placed or AI-received calls.
-- Covers all vendor coordination roles (delivery, venue, equipment, etc.)
-- and inbound voicemail. Client calls are permanently off-limits per product decision.

-- ---------------------------------------------------------------------------
-- ai_calls: universal call record for every role
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_calls (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Direction and role
  direction           TEXT NOT NULL DEFAULT 'outbound'
                      CHECK (direction IN ('outbound', 'inbound')),
  role                TEXT NOT NULL DEFAULT 'vendor_availability'
                      CHECK (role IN (
                        'vendor_availability',
                        'vendor_delivery',
                        'venue_confirmation',
                        'equipment_rental',
                        'inbound_vendor_callback',
                        'inbound_voicemail',
                        'inbound_unknown'
                      )),

  -- Twilio identifiers
  call_sid            TEXT,
  call_sid_parent     TEXT,

  -- Contact info (vendor / venue / unknown caller)
  contact_phone       TEXT NOT NULL,
  contact_name        TEXT,
  contact_type        TEXT CHECK (contact_type IN ('vendor', 'venue', 'unknown')),

  -- Entity links (nullable - set when known)
  vendor_id           UUID REFERENCES vendors(id) ON DELETE SET NULL,
  event_id            UUID REFERENCES events(id) ON DELETE SET NULL,

  -- Bridge to legacy supplier_calls table
  supplier_call_id    UUID REFERENCES supplier_calls(id) ON DELETE SET NULL,

  -- What the call was about
  subject             TEXT,  -- ingredient name, delivery item, event name, etc.

  -- Call lifecycle
  status              TEXT NOT NULL DEFAULT 'queued'
                      CHECK (status IN (
                        'queued', 'ringing', 'in_progress', 'completed',
                        'failed', 'no_answer', 'busy', 'voicemail'
                      )),
  duration_seconds    INTEGER,
  error_message       TEXT,

  -- Full concatenated transcript of both sides
  full_transcript     TEXT,

  -- Structured data extracted from the call (JSONB per gather step)
  -- e.g. { "step1": { "result": "yes" }, "step2": { "price": "$4.50/lb", "qty": "10 lbs" } }
  extracted_data      JSONB DEFAULT '{}'::jsonb,

  -- What was auto-created/updated as a result of this call
  -- e.g. ["vendor_price_point_created", "delivery_window_updated"]
  action_log          JSONB DEFAULT '[]'::jsonb,

  -- Recording
  recording_url       TEXT,

  -- Meta
  voicemail_left      BOOLEAN DEFAULT false,
  triggered_by        TEXT DEFAULT 'chef_manual'
                      CHECK (triggered_by IN (
                        'chef_manual', 'auto_delivery_prep',
                        'auto_event_prep', 'cron', 'inbound'
                      )),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_calls_chef_idx     ON ai_calls(chef_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_calls_call_sid_idx ON ai_calls(call_sid) WHERE call_sid IS NOT NULL;
CREATE INDEX IF NOT EXISTS ai_calls_role_idx     ON ai_calls(chef_id, role, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_calls_event_idx    ON ai_calls(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ai_calls_vendor_idx   ON ai_calls(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ai_calls_status_idx   ON ai_calls(chef_id, status)
  WHERE status NOT IN ('completed', 'failed', 'no_answer', 'busy');

-- ---------------------------------------------------------------------------
-- ai_call_transcripts: turn-by-turn conversation log
-- Every AI prompt and every caller response is stored here.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_call_transcripts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_call_id    UUID NOT NULL REFERENCES ai_calls(id) ON DELETE CASCADE,
  step          INTEGER NOT NULL DEFAULT 1,  -- gather step number
  speaker       TEXT NOT NULL CHECK (speaker IN ('ai', 'caller')),
  content       TEXT NOT NULL,               -- what was said
  confidence    NUMERIC(4,3),                -- Twilio speech confidence 0.000-1.000
  input_type    TEXT CHECK (input_type IN ('speech', 'dtmf', 'timeout', 'ai_prompt', 'voicemail')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_call_transcripts_call_idx ON ai_call_transcripts(ai_call_id, step);

-- ---------------------------------------------------------------------------
-- ai_call_routing_rules: per-chef voice system configuration
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_call_routing_rules (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id                   UUID NOT NULL UNIQUE REFERENCES chefs(id) ON DELETE CASCADE,

  -- Inbound Twilio number assigned to this chef (optional)
  inbound_phone_number      TEXT,

  -- Active hours (calls outside these hours go straight to voicemail)
  active_hours_start        TIME DEFAULT '08:00',
  active_hours_end          TIME DEFAULT '20:00',
  active_timezone           TEXT DEFAULT 'America/New_York',

  -- AI voice persona
  ai_voice                  TEXT DEFAULT 'Polly.Matthew-Neural',
  business_greeting         TEXT,  -- custom greeting for inbound calls

  -- Feature toggles
  enable_inbound_voicemail  BOOLEAN DEFAULT true,
  enable_vendor_delivery    BOOLEAN DEFAULT false,
  enable_venue_confirmation BOOLEAN DEFAULT false,
  enable_equipment_rental   BOOLEAN DEFAULT false,

  -- Daily call limit override (default 20)
  daily_call_limit          INTEGER DEFAULT 20,

  -- Chef's SMS number for notifications (receives alerts when calls come in)
  chef_sms_number           TEXT,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Add ai_call_id bridge to supplier_calls (non-destructive)
-- ---------------------------------------------------------------------------
ALTER TABLE supplier_calls
  ADD COLUMN IF NOT EXISTS ai_call_id UUID REFERENCES ai_calls(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Add AI confirmation fields to events (non-destructive)
-- ---------------------------------------------------------------------------
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS ai_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_delivery_confirmed_at TIMESTAMPTZ;
