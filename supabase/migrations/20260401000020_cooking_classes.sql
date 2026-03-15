-- Cooking Class Management
-- Registration, dietary collection, capacity + waitlist.
-- Additive only. No existing tables modified.

-- Table: Cooking Classes
CREATE TABLE IF NOT EXISTS cooking_classes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  title                   TEXT NOT NULL,
  description             TEXT,
  class_date              TIMESTAMPTZ NOT NULL,
  duration_minutes        INTEGER DEFAULT 120,
  max_capacity            INTEGER DEFAULT 10,
  price_per_person_cents  INTEGER NOT NULL,
  location                TEXT,
  menu_id                 UUID REFERENCES menus(id) ON DELETE SET NULL,
  skill_level             TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'all_levels')),
  cuisine_type            TEXT,
  what_to_bring           TEXT[],
  what_included           TEXT[],
  status                  TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'full', 'completed', 'cancelled')),
  registration_deadline   TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by              UUID
);

CREATE INDEX IF NOT EXISTS idx_cooking_classes_tenant_date ON cooking_classes(tenant_id, class_date);

COMMENT ON TABLE cooking_classes IS 'Cooking classes offered by a chef, with capacity and registration tracking.';

-- Table: Class Registrations
CREATE TABLE IF NOT EXISTS class_registrations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  class_id                UUID NOT NULL REFERENCES cooking_classes(id) ON DELETE CASCADE,
  attendee_name           TEXT NOT NULL,
  attendee_email          TEXT NOT NULL,
  allergies               TEXT[],
  dietary_restrictions    TEXT[],
  status                  TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'waitlisted', 'confirmed', 'cancelled', 'no_show')),
  amount_paid_cents       INTEGER DEFAULT 0,
  payment_status          TEXT DEFAULT 'unpaid',
  notes                   TEXT,
  registered_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_class_registrations_class_status ON class_registrations(class_id, status);

COMMENT ON TABLE class_registrations IS 'Registration records for cooking classes with dietary info and payment tracking.';

-- RLS: cooking_classes
ALTER TABLE cooking_classes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY cooking_classes_chef_policy ON cooking_classes
    USING (tenant_id = (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS: class_registrations
ALTER TABLE class_registrations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY class_registrations_chef_policy ON class_registrations
    USING (tenant_id = (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid() AND role = 'chef' LIMIT 1
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
