-- Chat Insights System
-- AI-powered extraction of actionable information from chat messages.
-- Non-canonical: all insights require explicit chef confirmation before affecting data.
--
-- New tables: chat_insights
-- New enums: insight_type, insight_status

-- ─── Enums ─────────────────────────────────────────────────────────────────

CREATE TYPE insight_type AS ENUM (
  'inquiry_intent',         -- Client wants to book / schedule something
  'dietary_preference',     -- Dietary info mentioned (vegan, keto, etc.)
  'allergy_mention',        -- Allergy or food sensitivity
  'important_date',         -- Birthday, anniversary, special date
  'guest_count',            -- Number of people mentioned
  'event_detail',           -- Event-related info (venue, time, theme)
  'budget_mention',         -- Budget or price discussion
  'location_mention',       -- Address or venue info
  'general_preference'      -- Any other preference (wine, style, etc.)
);

COMMENT ON TYPE insight_type IS 'Categories of AI-extracted insights from chat messages';

CREATE TYPE insight_status AS ENUM (
  'pending',    -- AI suggested, not yet reviewed by chef
  'accepted',   -- Chef confirmed and applied to system
  'dismissed'   -- Chef dismissed the suggestion
);

COMMENT ON TYPE insight_status IS 'Lifecycle states for chat insights';

-- ─── Table ─────────────────────────────────────────────────────────────────

CREATE TABLE chat_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  -- What was extracted
  insight_type insight_type NOT NULL,
  status insight_status NOT NULL DEFAULT 'pending',
  title TEXT NOT NULL,                    -- Short: "Birthday: June 15"
  detail TEXT,                            -- Longer context
  extracted_data JSONB,                   -- Structured: { date: "2026-06-15", person: "wife" }
  confidence REAL NOT NULL DEFAULT 0.0,   -- 0.0 to 1.0

  -- What the chef did with it
  applied_to TEXT,                        -- 'client_profile', 'inquiry', 'note'
  applied_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE chat_insights IS 'AI-extracted insights from chat messages. Non-canonical until chef accepts.';

-- ─── Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX idx_chat_insights_conv
  ON chat_insights(conversation_id, status);

CREATE INDEX idx_chat_insights_tenant
  ON chat_insights(tenant_id, status, created_at DESC);

CREATE INDEX idx_chat_insights_client
  ON chat_insights(client_id, status);

-- ─── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE chat_insights ENABLE ROW LEVEL SECURITY;

-- Only chefs can see/manage insights (they are internal intelligence)
DROP POLICY IF EXISTS chat_insights_chef_all ON chat_insights;
CREATE POLICY chat_insights_chef_all ON chat_insights
  FOR ALL USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
