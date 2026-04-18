// Service Config - Internal helpers (no 'use server')
// Functions here are NOT callable from the browser.
// Used by Remy context loader and other server-side code with a known tenantId.

import { createServerClient } from '@/lib/db/server'
import type { ChefServiceConfig } from './service-config-actions'

const DEFAULTS: ChefServiceConfig = {
  offers_wine_pairings: false,
  offers_cocktail_hour: false,
  offers_bartending: false,
  offers_dessert_course: true,
  offers_tastings: false,
  offers_grocery_shopping: true,
  offers_table_setup: false,
  offers_serving: false,
  offers_cleanup: true,
  offers_leftover_packaging: true,

  brings_own_cookware: true,
  brings_dinnerware: false,
  brings_linens: false,
  coordinates_rentals: false,

  brings_server: false,
  brings_sous_chef: false,
  brings_bartender: false,
  coordinates_additional_staff: false,

  handles_allergies: true,
  handles_religious_diets: false,
  handles_medical_diets: false,

  has_cancellation_policy: true,
  cancellation_terms: null,
  has_reschedule_policy: false,
  reschedule_terms: null,
  has_guest_count_deadline: false,
  guest_count_deadline_days: 3,
  charges_travel_fee: false,
  travel_fee_radius_miles: null,
  travel_fee_cents: null,
  has_minimum_spend: false,
  minimum_spend_cents: null,
  has_minimum_guests: false,
  minimum_guests: null,
  gratuity_policy: 'not_expected',
  grocery_cost_included: true,
  is_insured: false,

  custom_whats_included: null,
  custom_gratuity_note: null,
  custom_cleanup_note: null,
  custom_dietary_note: null,
  custom_travel_note: null,
  custom_intro_pitch: null,

  shares_menu_for_approval: true,
  does_preevent_checkin: true,
  sends_final_details_reminder: true,
  sends_postevent_followup: true,

  photographs_food: false,
  posts_on_social_media: false,
  offers_nda: false,
  coordinates_vendors: false,
  accommodates_outdoor_events: false,
  handles_kid_menus: false,
}

/**
 * Fetch service config for a tenant without auth check.
 * Used by Remy context loader, inquiry response actions, and other
 * server-side code that already has a verified tenantId.
 */
export async function getServiceConfigForTenant(tenantId: string): Promise<ChefServiceConfig> {
  const db: any = createServerClient()

  const { data } = await db.from('chef_service_config').select('*').eq('chef_id', tenantId).single()

  if (!data) return { ...DEFAULTS }

  const { id, chef_id, tenant_id, created_at, updated_at, ...config } = data
  return { ...DEFAULTS, ...config }
}
