-- Dish Index: Master catalog of every dish a chef has ever served
-- Supports: bulk menu upload, deduplication, recipe linking, analytics
-- Additive only — no DROP, no DELETE, no destructive operations

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE dish_rotation_status AS ENUM ('active', 'resting', 'retired', 'testing');
CREATE TYPE dish_prep_complexity AS ENUM ('quick', 'moderate', 'intensive');
CREATE TYPE dish_plating_difficulty AS ENUM ('simple', 'moderate', 'architectural');
CREATE TYPE upload_job_status AS ENUM ('uploaded', 'extracting', 'parsing', 'review', 'completed', 'failed');
-- ============================================
-- TABLE: menu_upload_jobs
-- Tracks each uploaded file through the parse pipeline
-- ============================================

CREATE TABLE menu_upload_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_storage_path TEXT,
  file_hash TEXT,
  extracted_text TEXT,
  parsed_dishes JSONB,
  status upload_job_status NOT NULL DEFAULT 'uploaded',
  event_date DATE,
  event_type TEXT,
  client_name TEXT,
  notes TEXT,
  error_message TEXT,
  dishes_found INTEGER DEFAULT 0,
  dishes_approved INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================
-- TABLE: dish_index
-- Master catalog of every unique dish
-- ============================================

CREATE TABLE dish_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  name TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  course TEXT NOT NULL,
  description TEXT,
  dietary_tags TEXT[] DEFAULT '{}',
  allergen_flags TEXT[] DEFAULT '{}',
  prep_complexity dish_prep_complexity,
  can_prep_ahead BOOLEAN,
  special_equipment TEXT[] DEFAULT '{}',
  plating_difficulty dish_plating_difficulty,
  photo_storage_path TEXT,
  linked_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  first_served DATE,
  last_served DATE,
  times_served INTEGER NOT NULL DEFAULT 0,
  is_signature BOOLEAN NOT NULL DEFAULT FALSE,
  rotation_status dish_rotation_status NOT NULL DEFAULT 'active',
  retired_at TIMESTAMPTZ,
  retirement_reason TEXT,
  season_affinity TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  dna JSONB DEFAULT '{}',
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, canonical_name, course)
);
-- ============================================
-- TABLE: dish_appearances
-- Every time a dish appeared on a menu
-- ============================================

CREATE TABLE dish_appearances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id UUID NOT NULL REFERENCES dish_index(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  menu_upload_job_id UUID REFERENCES menu_upload_jobs(id) ON DELETE SET NULL,
  menu_id UUID REFERENCES menus(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  event_date DATE,
  event_type TEXT,
  client_name TEXT,
  variation_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================
-- TABLE: dish_variations
-- Groups dishes that are variations of the same core dish
-- ============================================

CREATE TABLE dish_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  parent_dish_id UUID NOT NULL REFERENCES dish_index(id) ON DELETE CASCADE,
  variant_dish_id UUID NOT NULL REFERENCES dish_index(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'variation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(parent_dish_id, variant_dish_id),
  CHECK(parent_dish_id != variant_dish_id)
);
-- ============================================
-- TABLE: dish_feedback
-- Chef's self-assessment after serving a dish
-- ============================================

CREATE TABLE dish_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id UUID NOT NULL REFERENCES dish_index(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  client_reaction TEXT,
  execution_notes TEXT,
  would_serve_again BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_dish_index_tenant ON dish_index(tenant_id);
CREATE INDEX idx_dish_index_canonical ON dish_index(tenant_id, canonical_name);
CREATE INDEX idx_dish_index_course ON dish_index(tenant_id, course);
CREATE INDEX idx_dish_index_rotation ON dish_index(tenant_id, rotation_status) WHERE archived = false;
CREATE INDEX idx_dish_index_recipe ON dish_index(linked_recipe_id) WHERE linked_recipe_id IS NOT NULL;
CREATE INDEX idx_dish_index_signature ON dish_index(tenant_id) WHERE is_signature = true;
CREATE INDEX idx_dish_appearances_dish ON dish_appearances(dish_id);
CREATE INDEX idx_dish_appearances_tenant ON dish_appearances(tenant_id);
CREATE INDEX idx_dish_appearances_event ON dish_appearances(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_dish_appearances_date ON dish_appearances(tenant_id, event_date);
CREATE INDEX idx_dish_appearances_client ON dish_appearances(tenant_id, client_name) WHERE client_name IS NOT NULL;
CREATE INDEX idx_upload_jobs_tenant ON menu_upload_jobs(tenant_id);
CREATE INDEX idx_upload_jobs_status ON menu_upload_jobs(tenant_id, status);
CREATE INDEX idx_upload_jobs_hash ON menu_upload_jobs(tenant_id, file_hash) WHERE file_hash IS NOT NULL;
CREATE INDEX idx_dish_feedback_dish ON dish_feedback(dish_id);
CREATE INDEX idx_dish_feedback_tenant ON dish_feedback(tenant_id);
-- ============================================
-- TRIGGERS: auto-update updated_at
-- ============================================

CREATE TRIGGER update_dish_index_updated_at
  BEFORE UPDATE ON dish_index
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_upload_jobs_updated_at
  BEFORE UPDATE ON menu_upload_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE menu_upload_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dish_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE dish_appearances ENABLE ROW LEVEL SECURITY;
ALTER TABLE dish_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dish_feedback ENABLE ROW LEVEL SECURITY;
-- Upload jobs: chef full CRUD
CREATE POLICY "chef_upload_jobs_all" ON menu_upload_jobs
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- Dish index: chef full CRUD
CREATE POLICY "chef_dish_index_all" ON dish_index
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- Dish appearances: chef full CRUD
CREATE POLICY "chef_dish_appearances_all" ON dish_appearances
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- Dish variations: chef full CRUD
CREATE POLICY "chef_dish_variations_all" ON dish_variations
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- Dish feedback: chef full CRUD
CREATE POLICY "chef_dish_feedback_all" ON dish_feedback
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
-- ============================================
-- VIEWS
-- ============================================

-- Dish index summary with recipe cost and appearance count
CREATE OR REPLACE VIEW dish_index_summary AS
SELECT
  di.id,
  di.tenant_id,
  di.name,
  di.course,
  di.description,
  di.dietary_tags,
  di.allergen_flags,
  di.times_served,
  di.first_served,
  di.last_served,
  di.is_signature,
  di.rotation_status,
  di.linked_recipe_id,
  di.prep_complexity,
  di.plating_difficulty,
  di.tags,
  di.season_affinity,
  di.archived,
  r.name AS recipe_name,
  rcs.total_ingredient_cost_cents AS recipe_cost_cents,
  rcs.cost_per_portion_cents AS per_portion_cost_cents,
  COALESCE(fb.avg_rating, 0) AS avg_rating,
  COALESCE(fb.feedback_count, 0) AS feedback_count
FROM dish_index di
LEFT JOIN recipes r ON r.id = di.linked_recipe_id
LEFT JOIN recipe_cost_summary rcs ON rcs.recipe_id = di.linked_recipe_id
LEFT JOIN (
  SELECT dish_id,
    AVG(rating)::NUMERIC(3,1) AS avg_rating,
    COUNT(*) AS feedback_count
  FROM dish_feedback
  GROUP BY dish_id
) fb ON fb.dish_id = di.id;
