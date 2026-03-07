'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidateTag } from 'next/cache'
import type { ChefServiceConfig } from './service-config-types'

export type { ChefServiceConfig } from './service-config-types'

// ─── Defaults (matches DB defaults) ─────────────────────────────────────────

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

// ─── Read ───────────────────────────────────────────────────────────────────

export async function getServiceConfig(): Promise<ChefServiceConfig> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('chef_service_config')
    .select('*')
    .eq('chef_id', tenantId)
    .single()

  if (!data) return { ...DEFAULTS }

  // Map DB row to typed config (strip non-config fields)
  const { id, chef_id, tenant_id, created_at, updated_at, ...config } = data
  return { ...DEFAULTS, ...config }
}

// ─── Read for Remy (no auth - called from context loader with tenantId) ────

export async function getServiceConfigForTenant(tenantId: string): Promise<ChefServiceConfig> {
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('chef_service_config')
    .select('*')
    .eq('chef_id', tenantId)
    .single()

  if (!data) return { ...DEFAULTS }

  const { id, chef_id, tenant_id, created_at, updated_at, ...config } = data
  return { ...DEFAULTS, ...config }
}

// ─── Write ──────────────────────────────────────────────────────────────────

export async function saveServiceConfig(
  config: Partial<ChefServiceConfig>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const payload = {
    chef_id: tenantId,
    tenant_id: tenantId,
    ...config,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('chef_service_config')
    .upsert(payload, { onConflict: 'chef_id' })

  if (error) {
    console.error('[service-config] Save failed:', error)
    return { success: false, error: error.message }
  }

  // Bust Remy context cache
  revalidateTag(`chef-layout-${tenantId}`)

  return { success: true }
}
