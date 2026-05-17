'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  SettingsCategoryId,
  SettingsCategory,
  SettingItem,
  SettingStatus,
  SettingsCompleteness,
  GoLiveReadiness,
  GoLiveBlocker,
} from './guided-settings-types'

// ============================================
// INTERNAL: fetch raw chef + preferences + integrations
// ============================================

interface ChefRow {
  business_name: string | null
  email: string | null
  phone: string | null
  display_name: string | null
  bio: string | null
  profile_image_url: string | null
  slug: string | null
  tagline: string | null
  portal_primary_color: string | null
  website_url: string | null
  booking_slug: string | null
  booking_enabled: boolean
  booking_headline: string | null
  booking_bio_short: string | null
  stripe_account_id: string | null
  stripe_onboarding_complete: boolean
  logo_url: string | null
  timezone: string | null
  cancellation_cutoff_days: number | null
  gratuity_mode: string | null
  invoice_payment_terms: string | null
  onboarding_completed_at: string | null
}

interface PrefsRow {
  home_address: string | null
  home_zip: string | null
  default_grocery_store: string | null
  target_margin_percent: string | null
  sms_opt_in: boolean
  sms_notify_phone: string | null
  network_discoverable: boolean
  archetype: string | null
  owner_hourly_rate_cents: number | null
  revenue_goal_program_enabled: boolean
  notification_quiet_hours_enabled: boolean
  food_cost_target_percent: number | null
  twilio_phone_number: string | null
  sms_enabled: boolean
}

interface IntegrationRow {
  provider: string
  status: string
}

async function fetchSettingsData(tenantId: string) {
  const db = createServerClient()

  const chefPromise = db
    .from('chefs')
    .select(
      `business_name, email, phone, display_name, bio,
       profile_image_url, slug, tagline, portal_primary_color,
       website_url, booking_slug, booking_enabled, booking_headline,
       booking_bio_short, stripe_account_id, stripe_onboarding_complete,
       logo_url, timezone, cancellation_cutoff_days, gratuity_mode,
       invoice_payment_terms, onboarding_completed_at`
    )
    .eq('id', tenantId)
    .single()

  const prefsPromise = db
    .from('chef_preferences')
    .select(
      `home_address, home_zip, default_grocery_store,
       target_margin_percent, sms_opt_in, sms_notify_phone,
       network_discoverable, archetype, owner_hourly_rate_cents,
       revenue_goal_program_enabled, notification_quiet_hours_enabled,
       food_cost_target_percent, twilio_phone_number, sms_enabled`
    )
    .eq('tenant_id', tenantId)
    .single()

  const integrationsPromise = db
    .from('integration_connections')
    .select('provider, status')
    .eq('tenant_id', tenantId)

  const [chefResult, prefsResult, intResult] = await Promise.all([
    chefPromise,
    prefsPromise,
    integrationsPromise,
  ])

  return {
    chef: (chefResult.data ?? {}) as ChefRow,
    prefs: (prefsResult.data ?? {}) as PrefsRow,
    integrations: (intResult.data ?? []) as IntegrationRow[],
  }
}

// ============================================
// INTERNAL: build the full checklist from raw data
// ============================================

function hasValue(val: unknown): boolean {
  if (val === null || val === undefined) return false
  if (typeof val === 'string') return val.trim().length > 0
  return true
}

function status(val: unknown, isDefault?: boolean): SettingStatus {
  if (!hasValue(val)) return 'unset'
  return isDefault ? 'default' : 'set'
}

function buildChecklist(
  chef: ChefRow,
  prefs: PrefsRow,
  integrations: IntegrationRow[]
): SettingItem[] {
  const connectedProviders = new Set(
    integrations.filter((i) => i.status === 'connected').map((i) => i.provider)
  )

  const items: SettingItem[] = [
    // ---- daily_workflow ----
    {
      key: 'timezone',
      label: 'Timezone',
      hint: 'Set your local timezone so schedules and reminders are accurate.',
      status: chef.timezone && chef.timezone !== 'America/New_York' ? 'set' : 'default',
      href: '/settings/business',
      categoryId: 'daily_workflow',
      priority: 80,
    },
    {
      key: 'home_address',
      label: 'Home address',
      hint: 'Used for travel time estimates and shopping routes.',
      status: status(prefs.home_address),
      href: '/settings/business',
      categoryId: 'daily_workflow',
      priority: 70,
    },
    {
      key: 'default_grocery_store',
      label: 'Default grocery store',
      hint: 'Speeds up shopping lists and prep planning.',
      status: status(prefs.default_grocery_store),
      href: '/settings/business',
      categoryId: 'daily_workflow',
      priority: 50,
    },
    {
      key: 'sms_notifications',
      label: 'SMS notifications',
      hint: 'Get text alerts for new inquiries and booking updates.',
      status: prefs.sms_opt_in && hasValue(prefs.sms_notify_phone) ? 'set' : 'unset',
      href: '/settings/communications',
      categoryId: 'daily_workflow',
      priority: 40,
    },
    {
      key: 'notification_quiet_hours',
      label: 'Quiet hours',
      hint: 'Pause notifications during off hours.',
      status: prefs.notification_quiet_hours_enabled ? 'set' : 'default',
      href: '/settings/communications',
      categoryId: 'daily_workflow',
      priority: 20,
    },

    // ---- your_business ----
    {
      key: 'business_name',
      label: 'Business name',
      hint: 'Appears on invoices, contracts, and your public profile.',
      status: status(chef.business_name),
      href: '/settings/business',
      categoryId: 'your_business',
      priority: 100,
    },
    {
      key: 'archetype',
      label: 'Business type',
      hint: 'Private chef, caterer, meal prep, or another specialty.',
      status: status(prefs.archetype),
      href: '/settings/business',
      categoryId: 'your_business',
      priority: 90,
    },
    {
      key: 'stripe_payments',
      label: 'Stripe payments',
      hint: 'Accept payments, deposits, and send invoices.',
      status: chef.stripe_onboarding_complete ? 'set' : 'unset',
      href: '/settings/payments',
      categoryId: 'your_business',
      priority: 95,
    },
    {
      key: 'cancellation_policy',
      label: 'Cancellation policy',
      hint: 'Set your cutoff days and deposit refund rules.',
      status:
        chef.cancellation_cutoff_days != null && chef.cancellation_cutoff_days !== 15
          ? 'set'
          : 'default',
      href: '/settings/business',
      categoryId: 'your_business',
      priority: 60,
    },
    {
      key: 'gratuity_mode',
      label: 'Gratuity settings',
      hint: 'Choose how tips and service fees work for your events.',
      status: chef.gratuity_mode && chef.gratuity_mode !== 'discretionary' ? 'set' : 'default',
      href: '/settings/business',
      categoryId: 'your_business',
      priority: 30,
    },
    {
      key: 'target_margin',
      label: 'Target margin',
      hint: 'Your desired profit margin, used for pricing guidance.',
      status:
        prefs.target_margin_percent && prefs.target_margin_percent !== '60.00' ? 'set' : 'default',
      href: '/settings/business',
      categoryId: 'your_business',
      priority: 55,
    },
    {
      key: 'owner_hourly_rate',
      label: 'Your hourly rate',
      hint: 'Used to calculate labor costs in event pricing.',
      status: status(prefs.owner_hourly_rate_cents),
      href: '/settings/business',
      categoryId: 'your_business',
      priority: 50,
    },
    {
      key: 'food_cost_target',
      label: 'Food cost target',
      hint: 'Target food cost percentage for menu pricing.',
      status:
        prefs.food_cost_target_percent != null && prefs.food_cost_target_percent !== 30
          ? 'set'
          : 'default',
      href: '/settings/business',
      categoryId: 'your_business',
      priority: 35,
    },

    // ---- client_facing ----
    {
      key: 'display_name',
      label: 'Display name',
      hint: 'The name clients see on your profile and communications.',
      status: status(chef.display_name),
      href: '/settings/profile-branding',
      categoryId: 'client_facing',
      priority: 90,
    },
    {
      key: 'bio',
      label: 'Bio',
      hint: 'Tell potential clients about your background and style.',
      status: status(chef.bio),
      href: '/settings/profile-branding',
      categoryId: 'client_facing',
      priority: 85,
    },
    {
      key: 'profile_image',
      label: 'Profile photo',
      hint: 'A professional photo builds trust with new clients.',
      status: status(chef.profile_image_url),
      href: '/settings/profile-branding',
      categoryId: 'client_facing',
      priority: 80,
    },
    {
      key: 'logo',
      label: 'Business logo',
      hint: 'Shown on invoices, contracts, and your booking page.',
      status: status(chef.logo_url),
      href: '/settings/profile-branding',
      categoryId: 'client_facing',
      priority: 45,
    },
    {
      key: 'tagline',
      label: 'Tagline',
      hint: 'A short line that captures what makes you unique.',
      status: status(chef.tagline),
      href: '/settings/profile-branding',
      categoryId: 'client_facing',
      priority: 40,
    },
    {
      key: 'portal_color',
      label: 'Portal color',
      hint: 'Brand color used on your client portal.',
      status: status(chef.portal_primary_color),
      href: '/settings/profile-branding',
      categoryId: 'client_facing',
      priority: 25,
    },
    {
      key: 'booking_page',
      label: 'Booking page',
      hint: 'Enable and customize your public booking page.',
      status: chef.booking_enabled && hasValue(chef.booking_slug) ? 'set' : 'unset',
      href: '/settings/scheduling',
      categoryId: 'client_facing',
      priority: 75,
    },
    {
      key: 'slug',
      label: 'Public profile URL',
      hint: 'Your unique ChefFlow profile link.',
      status: status(chef.slug),
      href: '/settings/profile-branding',
      categoryId: 'client_facing',
      priority: 60,
    },

    // ---- integrations ----
    {
      key: 'stripe_connected',
      label: 'Stripe',
      hint: 'Process payments, deposits, and refunds.',
      status: chef.stripe_onboarding_complete ? 'set' : 'unset',
      href: '/settings/payments',
      categoryId: 'integrations',
      priority: 95,
    },
    {
      key: 'sms_twilio',
      label: 'SMS (Twilio)',
      hint: 'Send texts to clients directly from ChefFlow.',
      status: prefs.sms_enabled && hasValue(prefs.twilio_phone_number) ? 'set' : 'unset',
      href: '/settings/connections',
      categoryId: 'integrations',
      priority: 50,
    },
    {
      key: 'quickbooks',
      label: 'QuickBooks',
      hint: 'Sync invoices and payments with your bookkeeping.',
      status: connectedProviders.has('quickbooks') ? 'set' : 'unset',
      href: '/settings/connections',
      categoryId: 'integrations',
      priority: 40,
    },
    {
      key: 'square',
      label: 'Square',
      hint: 'Accept in-person payments at events.',
      status: connectedProviders.has('square') ? 'set' : 'unset',
      href: '/settings/connections',
      categoryId: 'integrations',
      priority: 35,
    },
    {
      key: 'google_calendar',
      label: 'Google Calendar',
      hint: 'Keep your ChefFlow calendar in sync.',
      status: connectedProviders.has('google_calendar') ? 'set' : 'unset',
      href: '/settings/connections',
      categoryId: 'integrations',
      priority: 30,
    },

    // ---- ai_and_system ----
    {
      key: 'network_discoverable',
      label: 'Chef network visibility',
      hint: 'Let other chefs on ChefFlow find you for referrals.',
      status: prefs.network_discoverable ? 'set' : 'default',
      href: '/settings/profile-branding',
      categoryId: 'ai_and_system',
      priority: 40,
    },
    {
      key: 'revenue_goals',
      label: 'Revenue goals',
      hint: 'Set targets so the dashboard tracks your progress.',
      status: prefs.revenue_goal_program_enabled ? 'set' : 'unset',
      href: '/settings/business',
      categoryId: 'ai_and_system',
      priority: 35,
    },
    {
      key: 'invoice_terms',
      label: 'Invoice payment terms',
      hint: 'Default terms printed on every invoice.',
      status: status(chef.invoice_payment_terms),
      href: '/settings/business',
      categoryId: 'ai_and_system',
      priority: 25,
    },
  ]

  return items
}

// ============================================
// INTERNAL: category metadata
// ============================================

const CATEGORY_META: Record<SettingsCategoryId, { label: string; description: string }> = {
  daily_workflow: {
    label: 'Daily workflow',
    description: 'Timezone, notifications, and prep defaults that shape your day.',
  },
  your_business: {
    label: 'Your business',
    description: 'Business name, payments, pricing, and policies.',
  },
  client_facing: {
    label: 'Client-facing',
    description: 'Profile, branding, booking page, and portal appearance.',
  },
  integrations: {
    label: 'Integrations',
    description: 'Payment processors, calendar sync, and connected services.',
  },
  ai_and_system: {
    label: 'AI and system',
    description: 'Network visibility, revenue goals, and system preferences.',
  },
}

const CATEGORY_ORDER: SettingsCategoryId[] = [
  'daily_workflow',
  'your_business',
  'client_facing',
  'integrations',
  'ai_and_system',
]

// ============================================
// PUBLIC ACTIONS
// ============================================

/**
 * Returns overall and per-category completeness percentages.
 */
export async function getSettingsCompleteness(): Promise<SettingsCompleteness> {
  const user = await requireChef()
  const data = await fetchSettingsData(user.tenantId!)
  const items = buildChecklist(data.chef, data.prefs, data.integrations)

  const configured = items.filter((i) => i.status === 'set').length
  const total = items.length

  const byCategory = CATEGORY_ORDER.map((catId) => {
    const catItems = items.filter((i) => i.categoryId === catId)
    const catConfigured = catItems.filter((i) => i.status === 'set').length
    return {
      categoryId: catId,
      label: CATEGORY_META[catId].label,
      configured: catConfigured,
      total: catItems.length,
      percent: catItems.length > 0 ? Math.round((catConfigured / catItems.length) * 100) : 100,
    }
  })

  return {
    configured,
    total,
    percent: total > 0 ? Math.round((configured / total) * 100) : 100,
    byCategory,
  }
}

/**
 * Returns the full checklist grouped by category.
 */
export async function getSettingsChecklist(): Promise<SettingsCategory[]> {
  const user = await requireChef()
  const data = await fetchSettingsData(user.tenantId!)
  const items = buildChecklist(data.chef, data.prefs, data.integrations)

  return CATEGORY_ORDER.map((catId) => ({
    id: catId,
    label: CATEGORY_META[catId].label,
    description: CATEGORY_META[catId].description,
    items: items.filter((i) => i.categoryId === catId).sort((a, b) => b.priority - a.priority),
  }))
}

/**
 * Returns the highest-priority unset setting the chef should configure next.
 * Returns null if everything is configured.
 */
export async function getNextSettingToComplete(): Promise<SettingItem | null> {
  const user = await requireChef()
  const data = await fetchSettingsData(user.tenantId!)
  const items = buildChecklist(data.chef, data.prefs, data.integrations)

  const unset = items.filter((i) => i.status === 'unset').sort((a, b) => b.priority - a.priority)

  return unset[0] ?? null
}

/**
 * Returns settings grouped by category (alias for components that need
 * the category structure without the full checklist metadata).
 */
export async function getSettingsByCategory(): Promise<Record<SettingsCategoryId, SettingItem[]>> {
  const user = await requireChef()
  const data = await fetchSettingsData(user.tenantId!)
  const items = buildChecklist(data.chef, data.prefs, data.integrations)

  const grouped = {} as Record<SettingsCategoryId, SettingItem[]>
  for (const catId of CATEGORY_ORDER) {
    grouped[catId] = items
      .filter((i) => i.categoryId === catId)
      .sort((a, b) => b.priority - a.priority)
  }
  return grouped
}

/**
 * Validates whether the chef has configured enough to start accepting bookings.
 * Blockers prevent go-live. Warnings are recommended but not required.
 */
export async function validateSettingsForGoLive(): Promise<GoLiveReadiness> {
  const user = await requireChef()
  const data = await fetchSettingsData(user.tenantId!)
  const items = buildChecklist(data.chef, data.prefs, data.integrations)

  // Keys that must be "set" before accepting bookings
  const REQUIRED_KEYS = new Set([
    'business_name',
    'stripe_payments',
    'display_name',
    'bio',
    'profile_image',
    'booking_page',
  ])

  // Keys that are strongly recommended
  const RECOMMENDED_KEYS = new Set([
    'home_address',
    'phone',
    'logo',
    'slug',
    'cancellation_policy',
    'owner_hourly_rate',
  ])

  const blockers: GoLiveBlocker[] = []
  const warnings: GoLiveBlocker[] = []

  for (const item of items) {
    if (item.status === 'set') continue

    if (REQUIRED_KEYS.has(item.key)) {
      blockers.push({
        key: item.key,
        label: item.label,
        hint: item.hint,
        href: item.href,
      })
    } else if (RECOMMENDED_KEYS.has(item.key)) {
      warnings.push({
        key: item.key,
        label: item.label,
        hint: item.hint,
        href: item.href,
      })
    }
  }

  // Also check phone directly from chef row (not in checklist but critical)
  if (!hasValue(data.chef.phone)) {
    blockers.push({
      key: 'phone',
      label: 'Phone number',
      hint: 'Clients and platforms need a way to reach you.',
      href: '/settings/business',
    })
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
  }
}
