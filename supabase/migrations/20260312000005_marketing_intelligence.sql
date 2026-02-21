-- Marketing Intelligence: A/B Testing, Content Performance, Campaign Tracking Enhancements
-- Closes gaps identified in competitive analysis vs Mailchimp

-- ============================================
-- ALTER: Add tracking columns to campaign_recipients
-- ============================================

ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS pixel_loaded_at TIMESTAMPTZ;
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS link_clicks JSONB DEFAULT '[]';

-- ============================================
-- TABLE 1: A/B TESTS
-- ============================================

CREATE TABLE IF NOT EXISTS ab_tests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  chef_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  variant_a_subject TEXT NOT NULL,
  variant_b_subject TEXT NOT NULL,
  test_percent      INTEGER NOT NULL DEFAULT 20
                    CHECK (test_percent >= 5 AND test_percent <= 50),
  winner            TEXT CHECK (winner IS NULL OR winner IN ('a', 'b')),
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ab_tests_chef ON ab_tests(chef_id);
CREATE INDEX idx_ab_tests_campaign ON ab_tests(campaign_id);

CREATE TRIGGER trg_ab_tests_updated_at
  BEFORE UPDATE ON ab_tests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 2: CONTENT PERFORMANCE
-- ============================================

CREATE TABLE IF NOT EXISTS content_performance (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  post_id             TEXT,
  platform            TEXT NOT NULL
                      CHECK (platform IN ('instagram', 'tiktok', 'facebook', 'youtube', 'twitter', 'other')),
  impressions         INTEGER NOT NULL DEFAULT 0,
  reach               INTEGER NOT NULL DEFAULT 0,
  saves               INTEGER NOT NULL DEFAULT 0,
  shares              INTEGER NOT NULL DEFAULT 0,
  inquiry_attributed  BOOLEAN NOT NULL DEFAULT false,
  recorded_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_performance_chef ON content_performance(chef_id, platform, recorded_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE ab_tests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_performance ENABLE ROW LEVEL SECURITY;

-- ab_tests
CREATE POLICY abt_chef_select ON ab_tests FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY abt_chef_insert ON ab_tests FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY abt_chef_update ON ab_tests FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY abt_chef_delete ON ab_tests FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- content_performance
CREATE POLICY cperf_chef_select ON content_performance FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cperf_chef_insert ON content_performance FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cperf_chef_update ON content_performance FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY cperf_chef_delete ON content_performance FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
