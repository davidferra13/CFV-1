-- Professional Development Tracking
-- Logs competitions, stages, press features, awards, courses, and speaking engagements.
-- Also tracks structured learning goals with target dates and completion status.

-- ============================================
-- TABLE 1: PROFESSIONAL ACHIEVEMENTS
-- ============================================

CREATE TABLE professional_achievements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id      UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  achieve_type TEXT NOT NULL DEFAULT 'other'
               CHECK (achieve_type IN (
                 'competition',
                 'stage',
                 'trail',
                 'press_feature',
                 'award',
                 'speaking',
                 'certification',
                 'course',
                 'book',
                 'podcast',
                 'other'
               )),

  title        TEXT NOT NULL,
  organization TEXT,
  achieve_date DATE,
  description  TEXT,
  outcome      TEXT,     -- e.g. "1st place", "Published in Food & Wine", "Completed with distinction"
  url          TEXT,
  image_url    TEXT,
  is_public    BOOLEAN NOT NULL DEFAULT false,   -- shown on public chef profile

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_achievements_chef        ON professional_achievements(chef_id, achieve_date DESC);
CREATE INDEX idx_achievements_public      ON professional_achievements(chef_id, is_public) WHERE is_public = true;

COMMENT ON TABLE professional_achievements IS 'Career achievements: competitions, stages, press, awards, courses, speaking. Public ones appear on the chef profile page.';

CREATE TRIGGER trg_achievements_updated_at
  BEFORE UPDATE ON professional_achievements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 2: LEARNING GOALS
-- ============================================

CREATE TABLE learning_goals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id      UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  title        TEXT NOT NULL,
  description  TEXT,
  target_date  DATE,

  category     TEXT NOT NULL DEFAULT 'technique'
               CHECK (category IN (
                 'technique',
                 'cuisine',
                 'business',
                 'sustainability',
                 'pastry',
                 'beverage',
                 'nutrition',
                 'other'
               )),

  status       TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'completed', 'abandoned')),

  completed_at TIMESTAMPTZ,
  notes        TEXT,   -- reflection notes on completion

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_learning_goals_chef ON learning_goals(chef_id, status);

COMMENT ON TABLE learning_goals IS 'Structured professional development goals with target dates and completion tracking.';

CREATE TRIGGER trg_learning_goals_updated_at
  BEFORE UPDATE ON learning_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE professional_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_goals            ENABLE ROW LEVEL SECURITY;

-- Chef full access
DROP POLICY IF EXISTS pa_chef_select ON professional_achievements;
CREATE POLICY pa_chef_select ON professional_achievements FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS pa_chef_insert ON professional_achievements;
CREATE POLICY pa_chef_insert ON professional_achievements FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS pa_chef_update ON professional_achievements;
CREATE POLICY pa_chef_update ON professional_achievements FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS pa_chef_delete ON professional_achievements;
CREATE POLICY pa_chef_delete ON professional_achievements FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());

-- Public achievements visible to anyone (for public profile page)
DROP POLICY IF EXISTS pa_public_select ON professional_achievements;
CREATE POLICY pa_public_select ON professional_achievements FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS lg_chef_select ON learning_goals;
CREATE POLICY lg_chef_select ON learning_goals FOR SELECT USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS lg_chef_insert ON learning_goals;
CREATE POLICY lg_chef_insert ON learning_goals FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS lg_chef_update ON learning_goals;
CREATE POLICY lg_chef_update ON learning_goals FOR UPDATE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
DROP POLICY IF EXISTS lg_chef_delete ON learning_goals;
CREATE POLICY lg_chef_delete ON learning_goals FOR DELETE USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
