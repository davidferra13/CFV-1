-- Guest consent + plus-one details
-- Adds photo sharing consent to RSVP, plus-one name/allergies

-- Photo consent: guests opt in/out of having event photos shared publicly
ALTER TABLE event_guests ADD COLUMN IF NOT EXISTS photo_consent BOOLEAN DEFAULT false;

-- Plus-one details: when a guest brings a plus-one, capture their info
ALTER TABLE event_guests ADD COLUMN IF NOT EXISTS plus_one_name TEXT;
ALTER TABLE event_guests ADD COLUMN IF NOT EXISTS plus_one_allergies TEXT[];
ALTER TABLE event_guests ADD COLUMN IF NOT EXISTS plus_one_dietary TEXT[];

-- Guest testimonials: guests can submit a review/testimonial from the recap page
CREATE TABLE IF NOT EXISTS guest_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES event_guests(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  testimonial TEXT NOT NULL CHECK (char_length(testimonial) <= 1000),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_approved BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_testimonials_event ON guest_testimonials(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_testimonials_tenant ON guest_testimonials(tenant_id, is_approved);

ALTER TABLE guest_testimonials ENABLE ROW LEVEL SECURITY;

-- Public: anyone can insert (from recap page)
CREATE POLICY guest_testimonials_public_insert ON guest_testimonials
  FOR INSERT WITH CHECK (true);

-- Public: only approved testimonials visible
CREATE POLICY guest_testimonials_public_read ON guest_testimonials
  FOR SELECT USING (is_approved = true);

-- Chef: full access to own tenant
CREATE POLICY guest_testimonials_chef_all ON guest_testimonials
  FOR ALL USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid() AND role = 'chef'
    )
  );
