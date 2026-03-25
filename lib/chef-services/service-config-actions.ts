'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidateTag } from 'next/cache'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChefServiceConfig {
  // Services
  offers_wine_pairings: boolean
  offers_cocktail_hour: boolean
  offers_bartending: boolean
  offers_dessert_course: boolean
  offers_tastings: boolean
  offers_grocery_shopping: boolean
  offers_table_setup: boolean
  offers_serving: boolean
  offers_cleanup: boolean
  offers_leftover_packaging: boolean

  // Equipment
  brings_own_cookware: boolean
  brings_dinnerware: boolean
  brings_linens: boolean
  coordinates_rentals: boolean

  // Staffing
  brings_server: boolean
  brings_sous_chef: boolean
  brings_bartender: boolean
  coordinates_additional_staff: boolean

  // Dietary
  handles_allergies: boolean
  handles_religious_diets: boolean
  handles_medical_diets: boolean

  // Policies
  has_cancellation_policy: boolean
  cancellation_terms: string | null
  has_reschedule_policy: boolean
  reschedule_terms: string | null
  has_guest_count_deadline: boolean
  guest_count_deadline_days: number | null
  charges_travel_fee: boolean
  travel_fee_radius_miles: number | null
  travel_fee_cents: number | null
  has_minimum_spend: boolean
  minimum_spend_cents: number | null
  has_minimum_guests: boolean
  minimum_guests: number | null
  gratuity_policy: 'not_expected' | 'appreciated' | 'included'
  grocery_cost_included: boolean
  is_insured: boolean

  // Custom response text (chef's own words for Remy to use)
  custom_whats_included: string | null
  custom_gratuity_note: string | null
  custom_cleanup_note: string | null
  custom_dietary_note: string | null
  custom_travel_note: string | null
  custom_intro_pitch: string | null

  // Communication
  shares_menu_for_approval: boolean
  does_preevent_checkin: boolean
  sends_final_details_reminder: boolean
  sends_postevent_followup: boolean

  // Extras
  photographs_food: boolean
  posts_on_social_media: boolean
  offers_nda: boolean
  coordinates_vendors: boolean
  accommodates_outdoor_events: boolean
  handles_kid_menus: boolean
}

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
  const db: any = createServerClient()

  const { data } = await db.from('chef_service_config').select('*').eq('chef_id', tenantId).single()

  if (!data) return { ...DEFAULTS }

  // Map DB row to typed config (strip non-config fields)
  const { id, chef_id, tenant_id, created_at, updated_at, ...config } = data
  return { ...DEFAULTS, ...config }
}

// ─── Read for Remy (no auth - called from context loader with tenantId) ────

export async function getServiceConfigForTenant(tenantId: string): Promise<ChefServiceConfig> {
  const db: any = createServerClient()

  const { data } = await db.from('chef_service_config').select('*').eq('chef_id', tenantId).single()

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
  const db: any = createServerClient()

  const payload = {
    chef_id: tenantId,
    tenant_id: tenantId,
    ...config,
    updated_at: new Date().toISOString(),
  }

  const { error } = await db.from('chef_service_config').upsert(payload, { onConflict: 'chef_id' })

  if (error) {
    console.error('[service-config] Save failed:', error)
    return { success: false, error: error.message }
  }

  // Bust Remy context cache
  revalidateTag(`chef-layout-${tenantId}`)

  return { success: true }
}

// ─── Format for Remy System Prompt ──────────────────────────────────────────

export async function formatServiceConfigForPrompt(config: ChefServiceConfig): Promise<string> {
  const lines: string[] = ['SERVICE CONFIGURATION (what this chef offers and how they operate):']

  // Services
  const services: string[] = []
  if (config.offers_grocery_shopping) services.push('grocery shopping')
  if (config.offers_cocktail_hour) services.push('cocktail hour / passed appetizers')
  if (config.offers_wine_pairings) services.push('wine/drink pairings')
  if (config.offers_bartending) services.push('bartending')
  if (config.offers_dessert_course) services.push('dessert course')
  if (config.offers_tastings) services.push('pre-event tastings')
  if (config.offers_table_setup) services.push('table setup')
  if (config.offers_serving) services.push('front-of-house serving')
  if (config.offers_cleanup) services.push('post-event cleanup')
  if (config.offers_leftover_packaging) services.push('leftover packaging')
  if (services.length > 0) lines.push(`Services included: ${services.join(', ')}`)

  // What they DON'T do (so Remy knows not to mention it)
  const notOffered: string[] = []
  if (!config.offers_grocery_shopping) notOffered.push('grocery shopping')
  if (!config.offers_cocktail_hour) notOffered.push('cocktail hour / passed appetizers')
  if (!config.offers_wine_pairings && !config.offers_bartending)
    notOffered.push('beverages/drink service')
  if (!config.offers_dessert_course) notOffered.push('dessert course')
  if (!config.offers_tastings) notOffered.push('tastings')
  if (!config.offers_table_setup) notOffered.push('table setup')
  if (!config.offers_serving) notOffered.push('front-of-house serving')
  if (!config.offers_cleanup) notOffered.push('cleanup')
  if (!config.offers_leftover_packaging) notOffered.push('leftover packaging')
  if (notOffered.length > 0)
    lines.push(`Does NOT offer: ${notOffered.join(', ')} (never mention these to clients)`)

  // Equipment
  const equipment: string[] = []
  if (config.brings_own_cookware) equipment.push('own knives/cookware')
  if (config.brings_dinnerware) equipment.push('dinnerware/tableware')
  if (config.brings_linens) equipment.push('linens')
  if (config.coordinates_rentals) equipment.push('can coordinate rentals')
  if (equipment.length > 0) lines.push(`Chef brings: ${equipment.join(', ')}`)

  // Staffing
  const staff: string[] = []
  if (config.brings_server) staff.push('server')
  if (config.brings_sous_chef) staff.push('sous chef/assistant')
  if (config.brings_bartender) staff.push('bartender')
  if (config.coordinates_additional_staff) staff.push('can coordinate additional staff')
  if (staff.length > 0) lines.push(`Staffing: ${staff.join(', ')}`)

  // Dietary
  const dietary: string[] = []
  if (config.handles_allergies) dietary.push('allergies (cross-contamination aware)')
  if (config.handles_religious_diets) dietary.push('religious dietary laws (halal, kosher)')
  if (config.handles_medical_diets) dietary.push('medical diets (keto, low-sodium, diabetic)')
  if (dietary.length > 0) lines.push(`Dietary handling: ${dietary.join(', ')}`)

  // Policies
  if (config.has_cancellation_policy) {
    lines.push(
      `Cancellation policy: yes${config.cancellation_terms ? ` (${config.cancellation_terms})` : ''}`
    )
  }
  if (config.has_reschedule_policy) {
    lines.push(
      `Reschedule policy: yes${config.reschedule_terms ? ` (${config.reschedule_terms})` : ''}`
    )
  }
  if (config.has_guest_count_deadline) {
    lines.push(`Guest count deadline: ${config.guest_count_deadline_days ?? 3} days before event`)
  }
  if (config.charges_travel_fee) {
    const radius = config.travel_fee_radius_miles
      ? `beyond ${config.travel_fee_radius_miles} miles`
      : ''
    const fee = config.travel_fee_cents ? `$${(config.travel_fee_cents / 100).toFixed(2)}` : ''
    lines.push(`Travel fee: ${[radius, fee].filter(Boolean).join(', ')}`)
  }
  if (config.has_minimum_spend) {
    lines.push(`Minimum spend: $${((config.minimum_spend_cents ?? 0) / 100).toFixed(2)}`)
  }
  if (config.has_minimum_guests) {
    lines.push(`Minimum guests: ${config.minimum_guests}`)
  }
  const gratuityLabels = {
    not_expected: 'not expected',
    appreciated: 'appreciated but not required',
    included: 'included in price',
  }
  lines.push(`Gratuity: ${gratuityLabels[config.gratuity_policy]}`)
  lines.push(
    `Grocery cost: ${config.grocery_cost_included ? 'included in service price' : 'billed separately'}`
  )
  if (config.is_insured) lines.push('Chef carries liability insurance')

  // Communication
  const comm: string[] = []
  if (config.shares_menu_for_approval) comm.push('shares menu for client approval before event')
  if (config.does_preevent_checkin) comm.push('pre-event check-in call/text')
  if (config.sends_final_details_reminder) comm.push('final details reminder before event')
  if (config.sends_postevent_followup) comm.push('post-event follow-up')
  if (comm.length > 0) lines.push(`Communication: ${comm.join(', ')}`)

  // Extras
  const extras: string[] = []
  if (config.photographs_food) extras.push('photographs food for portfolio')
  if (config.posts_on_social_media) extras.push('posts on social media (with permission)')
  if (config.offers_nda) extras.push('offers NDA/confidentiality agreements')
  if (config.coordinates_vendors) extras.push('coordinates with other vendors')
  if (config.accommodates_outdoor_events) extras.push('accommodates outdoor events')
  if (config.handles_kid_menus) extras.push('handles kid-friendly menus')
  if (extras.length > 0) lines.push(`Extras: ${extras.join(', ')}`)

  // Custom response text (use the chef's exact words when available)
  const customLines: string[] = []
  if (config.custom_intro_pitch)
    customLines.push(`Chef's intro pitch: "${config.custom_intro_pitch}"`)
  if (config.custom_whats_included)
    customLines.push(`What's included (chef's words): "${config.custom_whats_included}"`)
  if (config.custom_cleanup_note)
    customLines.push(`Cleanup (chef's words): "${config.custom_cleanup_note}"`)
  if (config.custom_dietary_note)
    customLines.push(`Dietary handling (chef's words): "${config.custom_dietary_note}"`)
  if (config.custom_gratuity_note)
    customLines.push(`Gratuity (chef's words): "${config.custom_gratuity_note}"`)
  if (config.custom_travel_note)
    customLines.push(`Travel (chef's words): "${config.custom_travel_note}"`)
  if (customLines.length > 0) {
    lines.push("\nCHEF'S OWN WORDS (use these exact phrases when communicating with clients):")
    lines.push(...customLines)
  }

  lines.push('')
  lines.push(
    'IMPORTANT: Only discuss services, equipment, staffing, and policies that are listed above. If something is NOT listed, do not mention it, offer it, or ask about it. The chef has explicitly configured what they do and do not offer.'
  )
  if (customLines.length > 0) {
    lines.push(
      'When the chef has provided their own words for a topic, use their language instead of generating your own. This is their voice, not yours.'
    )
  }

  return lines.join('\n')
}
