-- Event Templates: reusable event configurations for quick-create
CREATE TABLE IF NOT EXISTS event_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- Template fields (all nullable; only set values get applied)
  occasion TEXT,
  default_guest_count INTEGER,
  default_location_address TEXT,
  default_location_city TEXT,
  default_location_state TEXT,
  default_location_zip TEXT,
  default_notes TEXT,
  default_duration_hours NUMERIC(4,1),
  default_service_style TEXT,
  -- Pricing defaults
  default_pricing_model TEXT,
  default_quoted_price_cents INTEGER,
  -- Metadata
  use_count INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_templates_tenant ON event_templates(tenant_id);
