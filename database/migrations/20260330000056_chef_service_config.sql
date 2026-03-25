-- Chef Service Configuration
-- Stores per-chef toggles for what services they offer, how they operate,
-- and what Remy should/shouldn't talk about. One row per chef.

CREATE TABLE IF NOT EXISTS chef_service_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  chef_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,

  -- SERVICES I OFFER
  offers_wine_pairings boolean NOT NULL DEFAULT false,
  offers_cocktail_hour boolean NOT NULL DEFAULT false,
  offers_bartending boolean NOT NULL DEFAULT false,
  offers_dessert_course boolean NOT NULL DEFAULT true,
  offers_tastings boolean NOT NULL DEFAULT false,
  offers_grocery_shopping boolean NOT NULL DEFAULT true,
  offers_table_setup boolean NOT NULL DEFAULT false,
  offers_serving boolean NOT NULL DEFAULT false,
  offers_cleanup boolean NOT NULL DEFAULT true,
  offers_leftover_packaging boolean NOT NULL DEFAULT true,

  -- EQUIPMENT & SUPPLIES
  brings_own_cookware boolean NOT NULL DEFAULT true,
  brings_dinnerware boolean NOT NULL DEFAULT false,
  brings_linens boolean NOT NULL DEFAULT false,
  coordinates_rentals boolean NOT NULL DEFAULT false,

  -- STAFFING
  brings_server boolean NOT NULL DEFAULT false,
  brings_sous_chef boolean NOT NULL DEFAULT false,
  brings_bartender boolean NOT NULL DEFAULT false,
  coordinates_additional_staff boolean NOT NULL DEFAULT false,

  -- DIETARY HANDLING
  handles_allergies boolean NOT NULL DEFAULT true,
  handles_religious_diets boolean NOT NULL DEFAULT false,
  handles_medical_diets boolean NOT NULL DEFAULT false,

  -- POLICIES (toggles + values)
  -- Note: deposit fields live on chefs table (booking settings). Not duplicated here.
  has_cancellation_policy boolean NOT NULL DEFAULT true,
  cancellation_terms text DEFAULT null,
  has_reschedule_policy boolean NOT NULL DEFAULT false,
  reschedule_terms text DEFAULT null,
  has_guest_count_deadline boolean NOT NULL DEFAULT false,
  guest_count_deadline_days integer DEFAULT 3,
  charges_travel_fee boolean NOT NULL DEFAULT false,
  travel_fee_radius_miles integer DEFAULT null,
  travel_fee_cents integer DEFAULT null,
  has_minimum_spend boolean NOT NULL DEFAULT false,
  minimum_spend_cents integer DEFAULT null,
  has_minimum_guests boolean NOT NULL DEFAULT false,
  minimum_guests integer DEFAULT null,
  gratuity_policy text NOT NULL DEFAULT 'not_expected',
  grocery_cost_included boolean NOT NULL DEFAULT true,
  is_insured boolean NOT NULL DEFAULT false,

  -- CUSTOM RESPONSE TEXT (chef's own words for Remy to use)
  custom_whats_included text DEFAULT null,       -- "Shopping, cooking, plating, serving, cleanup. You don't lift a finger."
  custom_gratuity_note text DEFAULT null,        -- "Gratuity is never expected but always appreciated"
  custom_cleanup_note text DEFAULT null,         -- "I leave the kitchen cleaner than I found it"
  custom_dietary_note text DEFAULT null,         -- "I take allergies very seriously. Separate prep, dedicated tools."
  custom_travel_note text DEFAULT null,          -- "I cover the entire North Shore at no extra charge"
  custom_intro_pitch text DEFAULT null,          -- Chef's personal way of describing what they do in first replies

  -- COMMUNICATION PREFERENCES
  shares_menu_for_approval boolean NOT NULL DEFAULT true,
  does_preevent_checkin boolean NOT NULL DEFAULT true,
  sends_final_details_reminder boolean NOT NULL DEFAULT true,
  sends_postevent_followup boolean NOT NULL DEFAULT true,

  -- EXTRAS
  photographs_food boolean NOT NULL DEFAULT false,
  posts_on_social_media boolean NOT NULL DEFAULT false,
  offers_nda boolean NOT NULL DEFAULT false,
  coordinates_vendors boolean NOT NULL DEFAULT false,
  accommodates_outdoor_events boolean NOT NULL DEFAULT false,
  handles_kid_menus boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chef_service_config_chef_unique UNIQUE(chef_id),
  CONSTRAINT gratuity_policy_check CHECK (gratuity_policy IN ('not_expected', 'appreciated', 'included'))
);

-- RLS
ALTER TABLE chef_service_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chef_service_config_select" ON chef_service_config;
CREATE POLICY "chef_service_config_select"
  ON chef_service_config FOR SELECT
  USING (chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS "chef_service_config_insert" ON chef_service_config;
CREATE POLICY "chef_service_config_insert"
  ON chef_service_config FOR INSERT
  WITH CHECK (chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS "chef_service_config_update" ON chef_service_config;
CREATE POLICY "chef_service_config_update"
  ON chef_service_config FOR UPDATE
  USING (chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS "chef_service_config_delete" ON chef_service_config;
CREATE POLICY "chef_service_config_delete"
  ON chef_service_config FOR DELETE
  USING (chef_id = get_current_tenant_id());

-- updated_at trigger
CREATE TRIGGER chef_service_config_updated_at
  BEFORE UPDATE ON chef_service_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Grant access to authenticated users (RLS handles scoping)
GRANT SELECT, INSERT, UPDATE, DELETE ON chef_service_config TO authenticated;
