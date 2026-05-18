-- Lifecycle Coverage Gaps: Discovery, Reschedule, Contracts, Vendors, Departure
-- Additive migration: new columns and tables only. No drops or renames.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. DISCOVERY FIELDS ON EVENTS
-- Stage 2 gaps: dress code, table presentation, surprise, social media, vendors
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE events ADD COLUMN IF NOT EXISTS dress_code TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS table_presentation TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS surprise_details JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS social_media_consent TEXT CHECK (social_media_consent IN ('full', 'restricted', 'none', 'undiscussed'));
ALTER TABLE events ADD COLUMN IF NOT EXISTS beverage_expectations TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS beverage_service_type TEXT CHECK (beverage_service_type IN ('chef_provides', 'client_provides', 'byob', 'no_alcohol', 'tbd'));
ALTER TABLE events ADD COLUMN IF NOT EXISTS vendor_coordination_notes TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS confidentiality_required BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS vibe_atmosphere TEXT;

COMMENT ON COLUMN events.dress_code IS 'Chef/staff dress code for event (e.g. "all black", "business casual")';
COMMENT ON COLUMN events.table_presentation IS 'Client expectations for table setting (simple, elevated, themed, etc.)';
COMMENT ON COLUMN events.surprise_details IS 'JSON: {isSurprise: bool, honoree: string, coordinationNotes: string}';
COMMENT ON COLUMN events.social_media_consent IS 'Client permission for chef to photograph and post';
COMMENT ON COLUMN events.beverage_expectations IS 'Free-text notes on what client wants for drinks/bar';
COMMENT ON COLUMN events.beverage_service_type IS 'Who provides beverages';
COMMENT ON COLUMN events.vendor_coordination_notes IS 'Notes about external vendor coordination (florist, photographer, etc.)';
COMMENT ON COLUMN events.vibe_atmosphere IS 'Client-described vibe: casual, formal, interactive, intimate, party, etc.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. PER-GUEST DIETARY TRACKING
-- Currently dietary info is event-level only. Guests need individual tracking.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE guests ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT[] DEFAULT '{}';
ALTER TABLE guests ADD COLUMN IF NOT EXISTS allergies TEXT[] DEFAULT '{}';
ALTER TABLE guests ADD COLUMN IF NOT EXISTS allergy_severity TEXT CHECK (allergy_severity IN ('preference', 'intolerance', 'allergy', 'life_threatening'));
ALTER TABLE guests ADD COLUMN IF NOT EXISTS dietary_confirmed_at TIMESTAMPTZ;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS dietary_confirmed_via TEXT CHECK (dietary_confirmed_via IN ('host_reported', 'guest_confirmed', 'portal', 'email'));
ALTER TABLE guests ADD COLUMN IF NOT EXISTS spice_tolerance TEXT CHECK (spice_tolerance IN ('none', 'mild', 'medium', 'hot', 'very_hot'));

COMMENT ON COLUMN guests.dietary_restrictions IS 'Per-guest dietary restrictions (gluten-free, vegan, kosher, etc.)';
COMMENT ON COLUMN guests.allergies IS 'Per-guest allergens (nuts, shellfish, dairy, etc.)';
COMMENT ON COLUMN guests.allergy_severity IS 'Worst-case severity for this guest';
COMMENT ON COLUMN guests.dietary_confirmed_at IS 'When dietary info was last confirmed';
COMMENT ON COLUMN guests.dietary_confirmed_via IS 'How dietary info was confirmed';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. DIETARY OUTREACH TRACKING
-- Track automated "confirm your allergies" emails sent to guests
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dietary_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  response_data JSONB,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'responded', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dietary_outreach_event ON dietary_outreach(event_id);
CREATE INDEX IF NOT EXISTS idx_dietary_outreach_token ON dietary_outreach(token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dietary_outreach_unique ON dietary_outreach(event_id, guest_id);

ALTER TABLE dietary_outreach ENABLE ROW LEVEL SECURITY;

CREATE POLICY dietary_outreach_tenant ON dietary_outreach
  FOR ALL USING (tenant_id = get_current_tenant_id());

COMMENT ON TABLE dietary_outreach IS 'Tracks per-guest dietary confirmation emails. Token-based response without login.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. RESCHEDULE HISTORY + FEE TRACKING
-- Current reschedule is fire-and-forget. Need history and fee logic.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS event_reschedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  original_date DATE NOT NULL,
  new_date DATE NOT NULL,
  initiated_by TEXT NOT NULL CHECK (initiated_by IN ('chef', 'client')),
  reason TEXT,
  fee_cents INTEGER DEFAULT 0,
  fee_waived BOOLEAN DEFAULT false,
  fee_waive_reason TEXT,
  staff_notified BOOLEAN DEFAULT false,
  vendor_notified BOOLEAN DEFAULT false,
  client_notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_reschedules_event ON event_reschedules(event_id);

ALTER TABLE event_reschedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_reschedules_tenant ON event_reschedules
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- Add reschedule tracking to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS original_event_date DATE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS last_rescheduled_at TIMESTAMPTZ;

COMMENT ON TABLE event_reschedules IS 'Audit log of all reschedule actions with fee tracking and notification status.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. CONTRACT COUNTERSIGNATURE + CLAUSE ENHANCEMENTS
-- Chef needs to countersign. Templates need clause library.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE event_contracts ADD COLUMN IF NOT EXISTS chef_signed_at TIMESTAMPTZ;
ALTER TABLE event_contracts ADD COLUMN IF NOT EXISTS chef_signature_data_url TEXT;
ALTER TABLE event_contracts ADD COLUMN IF NOT EXISTS chef_signer_ip TEXT;
ALTER TABLE event_contracts ADD COLUMN IF NOT EXISTS insurance_cert_url TEXT;
ALTER TABLE event_contracts ADD COLUMN IF NOT EXISTS insurance_expires_at DATE;

COMMENT ON COLUMN event_contracts.chef_signed_at IS 'When chef countersigned the contract';
COMMENT ON COLUMN event_contracts.chef_signature_data_url IS 'Base64 PNG of chef signature';
COMMENT ON COLUMN event_contracts.insurance_cert_url IS 'URL to uploaded insurance certificate';

-- Contract clause library: reusable clause blocks for templates
CREATE TABLE IF NOT EXISTS contract_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('cancellation', 'reschedule', 'liability', 'kitchen', 'ip', 'confidentiality', 'force_majeure', 'dispute', 'payment', 'scope', 'custom')),
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contract_clauses_slug ON contract_clauses(chef_id, slug);
CREATE INDEX IF NOT EXISTS idx_contract_clauses_category ON contract_clauses(chef_id, category);

ALTER TABLE contract_clauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_clauses_tenant ON contract_clauses
  FOR ALL USING (chef_id = get_current_tenant_id());

COMMENT ON TABLE contract_clauses IS 'Reusable contract clause blocks. Chefs compose contracts by selecting clauses.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. EXTERNAL VENDOR TRACKING
-- Florists, photographers, DJs, rental companies per event
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS event_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_type TEXT NOT NULL CHECK (vendor_type IN ('florist', 'photographer', 'dj', 'rental', 'linen', 'av', 'decor', 'entertainment', 'transport', 'other')),
  vendor_name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  arrival_time TIME,
  departure_time TIME,
  cost_cents INTEGER,
  notes TEXT,
  confirmed BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_vendors_event ON event_vendors(event_id);

ALTER TABLE event_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_vendors_tenant ON event_vendors
  FOR ALL USING (tenant_id = get_current_tenant_id());

COMMENT ON TABLE event_vendors IS 'External vendors coordinated for an event (florist, photographer, DJ, rentals).';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. DEPARTURE CHECKLIST CATEGORY + LEFTOVER PACKAGING
-- Add "departure" to day-of-checklist categories and leftover tracking
-- ═══════════════════════════════════════════════════════════════════════════════

-- Expand category constraint to include departure and leftover
ALTER TABLE event_day_of_checklist DROP CONSTRAINT IF EXISTS event_day_of_checklist_category_check;
ALTER TABLE event_day_of_checklist ADD CONSTRAINT event_day_of_checklist_category_check
  CHECK (category IN ('gear', 'transport', 'outfit', 'mise', 'docs', 'departure', 'leftover', 'other'));

-- Leftover packaging tracking
CREATE TABLE IF NOT EXISTS event_leftovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  item_description TEXT NOT NULL,
  quantity TEXT,
  packaging_type TEXT CHECK (packaging_type IN ('container', 'wrapped', 'bag', 'box', 'other')),
  labeled BOOLEAN DEFAULT false,
  label_text TEXT,
  given_to TEXT,
  storage_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_leftovers_event ON event_leftovers(event_id);

ALTER TABLE event_leftovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_leftovers_tenant ON event_leftovers
  FOR ALL USING (tenant_id = get_current_tenant_id());

COMMENT ON TABLE event_leftovers IS 'Track leftover food packaging, labeling, and distribution after service.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. CANCELLATION POLICY ENHANCEMENT
-- Add fee schedule and notification tracking
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE events ADD COLUMN IF NOT EXISTS cancellation_fee_cents INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS cancellation_staff_notified BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS cancellation_vendor_notified BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS cancellation_refund_amount_cents INTEGER;

-- Chef cancellation fee schedule (tiered by days before event)
CREATE TABLE IF NOT EXISTS cancellation_fee_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  days_before_min INTEGER NOT NULL,
  days_before_max INTEGER NOT NULL,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('percent', 'flat')),
  fee_value INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cancel_fee_schedule_chef ON cancellation_fee_schedule(chef_id);

ALTER TABLE cancellation_fee_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY cancel_fee_schedule_tenant ON cancellation_fee_schedule
  FOR ALL USING (chef_id = get_current_tenant_id());

COMMENT ON TABLE cancellation_fee_schedule IS 'Tiered cancellation fees by days before event. fee_value is cents (flat) or basis points (percent).';
