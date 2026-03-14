-- Analytics: Marketing Spend + Competitor Benchmarks + Website Stats
-- Three new tables for tracking ad spend, competitor pricing, and website traffic.
-- Purely additive — no existing tables or data are modified.

-- ============================================================
-- 1. MARKETING SPEND LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS marketing_spend_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id       UUID        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  spend_date    DATE        NOT NULL,
  channel       TEXT        NOT NULL CHECK (channel IN (
    'instagram_ads', 'google_ads', 'facebook_ads',
    'tiktok_ads', 'print', 'event_sponsorship', 'other'
  )),
  amount_cents  INTEGER     NOT NULL CHECK (amount_cents > 0),
  campaign_name TEXT,
  notes         TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS msl_chef_date_idx ON marketing_spend_log (chef_id, spend_date DESC);
CREATE INDEX IF NOT EXISTS msl_chef_channel_idx ON marketing_spend_log (chef_id, channel);
CREATE TRIGGER msl_updated_at
  BEFORE UPDATE ON marketing_spend_log
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE marketing_spend_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chef_msl_all"
  ON marketing_spend_log FOR ALL
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id())
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
COMMENT ON TABLE marketing_spend_log IS
  'Chef-entered ad spend by channel and date. Used to compute CAC, CPL, and ROAS across marketing channels.';
-- ============================================================
-- 2. COMPETITOR BENCHMARKS
-- ============================================================
-- Manual entry only — chef records local market rates periodically.

CREATE TABLE IF NOT EXISTS competitor_benchmarks (
  id                                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id                           UUID        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  recorded_date                     DATE        NOT NULL DEFAULT CURRENT_DATE,
  local_avg_price_per_person_cents  INTEGER     CHECK (local_avg_price_per_person_cents > 0),
  own_price_per_person_cents        INTEGER     CHECK (own_price_per_person_cents > 0),
  local_avg_rating                  NUMERIC(3,2) CHECK (local_avg_rating BETWEEN 1.0 AND 5.0),
  notes                             TEXT,

  created_at                        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cb_chef_date_idx ON competitor_benchmarks (chef_id, recorded_date DESC);
ALTER TABLE competitor_benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chef_cb_all"
  ON competitor_benchmarks FOR ALL
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id())
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
COMMENT ON TABLE competitor_benchmarks IS
  'Manually recorded local market benchmarks: competitor pricing, average ratings. Used for positioning analysis.';
-- ============================================================
-- 3. WEBSITE STATS SNAPSHOTS
-- ============================================================
-- Monthly snapshots — entered manually or pulled from Vercel Analytics / Plausible.

CREATE TABLE IF NOT EXISTS website_stats_snapshots (
  id                              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id                         UUID        NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  snapshot_month                  DATE        NOT NULL,  -- first day of the month, e.g. 2026-03-01

  unique_visitors                 INTEGER,
  pageviews                       INTEGER,
  bounce_rate_percent             NUMERIC(5,2),
  avg_session_seconds             INTEGER,
  top_source                      TEXT CHECK (top_source IN ('google', 'direct', 'instagram', 'referral', 'other')),
  inquiry_conversion_rate_percent NUMERIC(5,2),  -- % of visitors who submitted inquiry/contact form

  notes                           TEXT,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT wss_chef_month_unique UNIQUE (chef_id, snapshot_month)
);
CREATE INDEX IF NOT EXISTS wss_chef_month_idx ON website_stats_snapshots (chef_id, snapshot_month DESC);
ALTER TABLE website_stats_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chef_wss_all"
  ON website_stats_snapshots FOR ALL
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id())
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
COMMENT ON TABLE website_stats_snapshots IS
  'Monthly website traffic snapshots. Can be entered manually or synced from Vercel Analytics / Plausible.';
