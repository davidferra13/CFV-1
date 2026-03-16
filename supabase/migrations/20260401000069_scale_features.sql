-- Scale Features: multi-stakeholder events, kitchen assessments

-- Event contacts (multiple stakeholders per event)
CREATE TABLE IF NOT EXISTS event_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('primary', 'planner', 'venue_manager', 'host', 'coordinator', 'assistant', 'other')),
  visibility TEXT NOT NULL DEFAULT 'full' CHECK (visibility IN ('full', 'logistics_only', 'day_of_only')),
  receives_notifications BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE event_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_event_contacts_access" ON event_contacts
  FOR ALL USING (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

CREATE INDEX idx_event_contacts_event ON event_contacts(event_id);

-- Kitchen assessments (per venue/client)
CREATE TABLE IF NOT EXISTS kitchen_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  location_name TEXT NOT NULL,
  -- Equipment checklist
  has_oven BOOLEAN DEFAULT false,
  has_stovetop BOOLEAN DEFAULT false,
  burner_count INTEGER,
  has_microwave BOOLEAN DEFAULT false,
  has_food_processor BOOLEAN DEFAULT false,
  has_blender BOOLEAN DEFAULT false,
  has_stand_mixer BOOLEAN DEFAULT false,
  has_grill BOOLEAN DEFAULT false,
  has_dishwasher BOOLEAN DEFAULT false,
  -- Space assessment
  counter_space TEXT CHECK (counter_space IN ('limited', 'adequate', 'spacious')),
  refrigerator_space TEXT CHECK (refrigerator_space IN ('limited', 'adequate', 'spacious')),
  freezer_space TEXT CHECK (freezer_space IN ('limited', 'adequate', 'spacious')),
  -- Constraints and bring-lists
  constraints TEXT[] DEFAULT '{}',
  equipment_to_bring TEXT[] DEFAULT '{}',
  -- Documentation
  photos JSONB DEFAULT '[]',
  notes TEXT,
  -- Metadata
  assessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kitchen_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_kitchen_assessment_access" ON kitchen_assessments
  FOR ALL USING (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()))
  WITH CHECK (chef_id IN (SELECT id FROM chefs WHERE auth_user_id = auth.uid()));

CREATE INDEX idx_kitchen_assessments_client ON kitchen_assessments(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_kitchen_assessments_chef ON kitchen_assessments(chef_id);
