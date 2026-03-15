-- Build Forward Features: Client Proposals, Staff Event Tokens, Meal Prep Programs,
-- Menu Nutrition, and Social-Event linkage.
--
-- SAFE: Additive only. No existing tables dropped or columns removed.
-- Extends existing infrastructure: event_photos, social_posts, recurring_services,
-- proposal_templates, followup_rules.

-- ============================================================
-- 1) CLIENT PROPOSALS (shareable, token-gated proposal for a specific client/event)
-- Links a proposal template to a real event with a share token the client can view.
-- ============================================================

CREATE TABLE IF NOT EXISTS client_proposals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- What this proposal is for
  event_id            UUID REFERENCES events(id) ON DELETE SET NULL,
  client_id           UUID REFERENCES clients(id) ON DELETE SET NULL,
  template_id         UUID REFERENCES proposal_templates(id) ON DELETE SET NULL,
  menu_id             UUID REFERENCES menus(id) ON DELETE SET NULL,

  -- Shareable token (public access without auth)
  share_token         TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),

  -- Content
  title               TEXT NOT NULL DEFAULT '',
  personal_note       TEXT,
  cover_photo_url     TEXT,
  total_price_cents   INTEGER NOT NULL DEFAULT 0,
  selected_addons     JSONB NOT NULL DEFAULT '[]',

  -- Status
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'sent', 'viewed', 'approved', 'declined', 'expired')),
  sent_at             TIMESTAMPTZ,
  viewed_at           TIMESTAMPTZ,
  approved_at         TIMESTAMPTZ,
  declined_at         TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT client_proposals_unique_token UNIQUE (share_token)
);

CREATE INDEX idx_client_proposals_tenant ON client_proposals(tenant_id, status);
CREATE INDEX idx_client_proposals_event ON client_proposals(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_client_proposals_token ON client_proposals(share_token);

CREATE TRIGGER trg_client_proposals_updated_at
  BEFORE UPDATE ON client_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE client_proposals IS
  'Shareable visual proposals linking a template + menu to a specific event/client. '
  'Clients access via token-gated public URL without authentication.';

-- ============================================================
-- 2) STAFF EVENT TOKENS (token-gated staff access per event)
-- Staff get a link via text/email before each event. No login required.
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_event_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  staff_member_id UUID NOT NULL,

  -- Token for public access
  token           TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),

  -- What the staff member sees
  assigned_tasks  JSONB NOT NULL DEFAULT '[]',
  assigned_station TEXT,

  -- State
  is_revoked      BOOLEAN NOT NULL DEFAULT false,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  last_accessed   TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT staff_event_tokens_unique_token UNIQUE (token),
  CONSTRAINT staff_event_tokens_unique_per_event UNIQUE (tenant_id, event_id, staff_member_id)
);

CREATE INDEX idx_staff_event_tokens_token ON staff_event_tokens(token);
CREATE INDEX idx_staff_event_tokens_event ON staff_event_tokens(event_id);

CREATE TRIGGER trg_staff_event_tokens_updated_at
  BEFORE UPDATE ON staff_event_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE staff_event_tokens IS
  'Token-gated staff access to event details. Staff see schedule, tasks, dietary alerts, '
  'packing list, and venue info on their phone without needing to log in.';

-- ============================================================
-- 3) MEAL PREP PROGRAMS (extends recurring_services with meal prep operations)
-- Rotating menus, container tracking, delivery scheduling.
-- ============================================================

CREATE TABLE IF NOT EXISTS meal_prep_programs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  recurring_service_id  UUID NOT NULL REFERENCES recurring_services(id) ON DELETE CASCADE,
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Delivery details
  delivery_day          SMALLINT NOT NULL DEFAULT 1 CHECK (delivery_day BETWEEN 0 AND 6),
  delivery_window_start TEXT NOT NULL DEFAULT '10:00',
  delivery_window_end   TEXT NOT NULL DEFAULT '14:00',
  delivery_address      TEXT,
  delivery_instructions TEXT,

  -- Container tracking
  containers_out        INTEGER NOT NULL DEFAULT 0,
  containers_returned   INTEGER NOT NULL DEFAULT 0,
  container_deposit_cents INTEGER NOT NULL DEFAULT 0,

  -- Menu rotation (4-week cycle)
  rotation_weeks        INTEGER NOT NULL DEFAULT 4 CHECK (rotation_weeks BETWEEN 1 AND 12),
  current_rotation_week INTEGER NOT NULL DEFAULT 1,

  -- Status
  status                TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'ended')),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meal_prep_programs_tenant ON meal_prep_programs(tenant_id, status);
CREATE INDEX idx_meal_prep_programs_client ON meal_prep_programs(tenant_id, client_id);

CREATE TRIGGER trg_meal_prep_programs_updated_at
  BEFORE UPDATE ON meal_prep_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Weekly menu assignments for each rotation slot
CREATE TABLE IF NOT EXISTS meal_prep_weeks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id          UUID NOT NULL REFERENCES meal_prep_programs(id) ON DELETE CASCADE,
  tenant_id           UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Which week in the rotation
  rotation_week       INTEGER NOT NULL CHECK (rotation_week BETWEEN 1 AND 12),

  -- Menu for this week
  menu_id             UUID REFERENCES menus(id) ON DELETE SET NULL,
  custom_dishes       JSONB NOT NULL DEFAULT '[]',
  notes               TEXT,

  -- Prep tracking
  prepped_at          TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  containers_sent     INTEGER NOT NULL DEFAULT 0,
  containers_back     INTEGER NOT NULL DEFAULT 0,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT meal_prep_weeks_unique UNIQUE (program_id, rotation_week)
);

CREATE INDEX idx_meal_prep_weeks_program ON meal_prep_weeks(program_id, rotation_week);

CREATE TRIGGER trg_meal_prep_weeks_updated_at
  BEFORE UPDATE ON meal_prep_weeks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE meal_prep_programs IS
  'Meal prep operations layer on top of recurring_services. Handles delivery scheduling, '
  'container tracking, and rotating menu assignments for weekly meal prep clients.';

COMMENT ON TABLE meal_prep_weeks IS
  'Per-week menu assignments within a meal prep rotation cycle. Tracks prep and delivery status.';

-- ============================================================
-- 4) MENU NUTRITION (per-dish nutritional breakdown)
-- Populated via Spoonacular API, chef can override.
-- ============================================================

CREATE TABLE IF NOT EXISTS menu_nutrition (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  menu_id         UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  recipe_id       UUID REFERENCES recipes(id) ON DELETE SET NULL,

  -- Dish identifier (if not linked to recipe)
  dish_name       TEXT NOT NULL DEFAULT '',

  -- Macros per serving
  calories        INTEGER,
  protein_g       NUMERIC(6,1),
  carbs_g         NUMERIC(6,1),
  fat_g           NUMERIC(6,1),
  fiber_g         NUMERIC(6,1),
  sodium_mg       INTEGER,

  -- Allergens (structured)
  allergens       JSONB NOT NULL DEFAULT '[]',

  -- Source tracking
  source          TEXT NOT NULL DEFAULT 'manual'
                  CHECK (source IN ('manual', 'spoonacular', 'usda')),
  chef_override   BOOLEAN NOT NULL DEFAULT false,
  api_response    JSONB,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT menu_nutrition_unique_dish UNIQUE (menu_id, recipe_id, dish_name)
);

CREATE INDEX idx_menu_nutrition_menu ON menu_nutrition(menu_id);
CREATE INDEX idx_menu_nutrition_recipe ON menu_nutrition(recipe_id) WHERE recipe_id IS NOT NULL;

CREATE TRIGGER trg_menu_nutrition_updated_at
  BEFORE UPDATE ON menu_nutrition
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE menu_nutrition IS
  'Per-dish nutritional breakdown for menus. Populated via Spoonacular API or manual entry. '
  'Chef can override AI-generated values. Pro feature (nutrition-analysis module).';

-- ============================================================
-- 5) SOCIAL POSTS: Add event_id column for event-to-social linking
-- ============================================================

ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_social_posts_event ON social_posts(event_id) WHERE event_id IS NOT NULL;

COMMENT ON COLUMN social_posts.event_id IS
  'Links a social post to the event it was inspired by. Used for event-to-social pipeline.';

-- ============================================================
-- 6) FOLLOW-UP SEQUENCE SENDS (tracks individual email sends from sequences)
-- ============================================================

CREATE TABLE IF NOT EXISTS follow_up_sends (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Which rule triggered this
  rule_id           UUID REFERENCES followup_rules(id) ON DELETE SET NULL,

  -- Step info
  step_number       INTEGER NOT NULL DEFAULT 1,
  subject           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'sent', 'opened', 'clicked', 'bounced', 'skipped')),

  -- Scheduling
  scheduled_for     TIMESTAMPTZ NOT NULL,
  sent_at           TIMESTAMPTZ,

  -- Cancellation (if client rebooks before sequence completes)
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_follow_up_sends_tenant ON follow_up_sends(tenant_id, status);
CREATE INDEX idx_follow_up_sends_event ON follow_up_sends(event_id);
CREATE INDEX idx_follow_up_sends_scheduled ON follow_up_sends(scheduled_for) WHERE status = 'pending';

CREATE TRIGGER trg_follow_up_sends_updated_at
  BEFORE UPDATE ON follow_up_sends
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE follow_up_sends IS
  'Individual email sends from post-event follow-up sequences. Tracks send status, '
  'open/click, and auto-cancellation when client rebooks.';

-- ============================================================
-- ROW LEVEL SECURITY (all new tables)
-- ============================================================

ALTER TABLE client_proposals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_event_tokens   ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_prep_programs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_prep_weeks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_nutrition       ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_sends      ENABLE ROW LEVEL SECURITY;

-- client_proposals: chef CRUD + public read via token
DROP POLICY IF EXISTS cp_chef_select ON client_proposals;
CREATE POLICY cp_chef_select ON client_proposals FOR SELECT USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS cp_chef_insert ON client_proposals;
CREATE POLICY cp_chef_insert ON client_proposals FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS cp_chef_update ON client_proposals;
CREATE POLICY cp_chef_update ON client_proposals FOR UPDATE USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS cp_chef_delete ON client_proposals;
CREATE POLICY cp_chef_delete ON client_proposals FOR DELETE USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());

-- staff_event_tokens: chef CRUD
DROP POLICY IF EXISTS set_chef_select ON staff_event_tokens;
CREATE POLICY set_chef_select ON staff_event_tokens FOR SELECT USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS set_chef_insert ON staff_event_tokens;
CREATE POLICY set_chef_insert ON staff_event_tokens FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS set_chef_update ON staff_event_tokens;
CREATE POLICY set_chef_update ON staff_event_tokens FOR UPDATE USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS set_chef_delete ON staff_event_tokens;
CREATE POLICY set_chef_delete ON staff_event_tokens FOR DELETE USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());

-- meal_prep_programs: chef CRUD
DROP POLICY IF EXISTS mpp_chef_select ON meal_prep_programs;
CREATE POLICY mpp_chef_select ON meal_prep_programs FOR SELECT USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS mpp_chef_insert ON meal_prep_programs;
CREATE POLICY mpp_chef_insert ON meal_prep_programs FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS mpp_chef_update ON meal_prep_programs;
CREATE POLICY mpp_chef_update ON meal_prep_programs FOR UPDATE USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS mpp_chef_delete ON meal_prep_programs;
CREATE POLICY mpp_chef_delete ON meal_prep_programs FOR DELETE USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());

-- meal_prep_weeks: chef CRUD (via parent tenant join)
DROP POLICY IF EXISTS mpw_chef_select ON meal_prep_weeks;
CREATE POLICY mpw_chef_select ON meal_prep_weeks FOR SELECT USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS mpw_chef_insert ON meal_prep_weeks;
CREATE POLICY mpw_chef_insert ON meal_prep_weeks FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS mpw_chef_update ON meal_prep_weeks;
CREATE POLICY mpw_chef_update ON meal_prep_weeks FOR UPDATE USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS mpw_chef_delete ON meal_prep_weeks;
CREATE POLICY mpw_chef_delete ON meal_prep_weeks FOR DELETE USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());

-- menu_nutrition: chef CRUD
DROP POLICY IF EXISTS mn_chef_select ON menu_nutrition;
CREATE POLICY mn_chef_select ON menu_nutrition FOR SELECT USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS mn_chef_insert ON menu_nutrition;
CREATE POLICY mn_chef_insert ON menu_nutrition FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS mn_chef_update ON menu_nutrition;
CREATE POLICY mn_chef_update ON menu_nutrition FOR UPDATE USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS mn_chef_delete ON menu_nutrition;
CREATE POLICY mn_chef_delete ON menu_nutrition FOR DELETE USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());

-- follow_up_sends: chef CRUD
DROP POLICY IF EXISTS fus_chef_select ON follow_up_sends;
CREATE POLICY fus_chef_select ON follow_up_sends FOR SELECT USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS fus_chef_insert ON follow_up_sends;
CREATE POLICY fus_chef_insert ON follow_up_sends FOR INSERT WITH CHECK (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS fus_chef_update ON follow_up_sends;
CREATE POLICY fus_chef_update ON follow_up_sends FOR UPDATE USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
DROP POLICY IF EXISTS fus_chef_delete ON follow_up_sends;
CREATE POLICY fus_chef_delete ON follow_up_sends FOR DELETE USING (get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id());
