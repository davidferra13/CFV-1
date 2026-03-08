// Chef Preferences Server Actions
// Manages chef-level configuration for scheduling, stores, and DOPs.
// Note: chef_preferences table added in Layer 5 migration.
// Type assertions used until types/database.ts is regenerated.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import type {
  ChefPreferences,
  DashboardWidgetPreference,
  DefaultStore,
  RevenueGoalCustom,
} from '@/lib/scheduling/types'
import {
  DASHBOARD_WIDGET_IDS,
  DEFAULT_DASHBOARD_WIDGETS,
  DEFAULT_PREFERENCES,
} from '@/lib/scheduling/types'

// ============================================
// VALIDATION
// ============================================

const DefaultStoreSchema = z.object({
  name: z.string().trim().min(1),
  address: z.string().trim().default(''),
  place_id: z.string().optional().nullable(),
})

const RevenueGoalCustomSchema = z
  .object({
    id: z.string().uuid(),
    label: z.string().trim().min(1).max(80),
    target_cents: z.number().int().min(0),
    period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    enabled: z.boolean(),
  })
  .refine((goal) => goal.period_start <= goal.period_end, {
    message: 'Custom goal start date must be before end date',
    path: ['period_end'],
  })

const DashboardWidgetPreferenceSchema = z.object({
  id: z.enum(DASHBOARD_WIDGET_IDS),
  enabled: z.boolean(),
})

const PrimaryNavHrefSchema = z.string().trim().min(1).max(160)
const PrimaryNavHrefArraySchema = z.array(PrimaryNavHrefSchema).max(200)

const UpdatePreferencesSchema = z.object({
  home_address: z.string().optional().nullable(),
  home_city: z.string().optional().nullable(),
  home_state: z.string().optional().nullable(),
  home_zip: z.string().optional().nullable(),

  default_stores: z.array(DefaultStoreSchema).optional(),

  default_grocery_store: z.string().optional().nullable(),
  default_grocery_address: z.string().optional().nullable(),
  default_liquor_store: z.string().optional().nullable(),
  default_liquor_address: z.string().optional().nullable(),
  default_specialty_stores: z.array(DefaultStoreSchema).optional(),

  default_buffer_minutes: z.number().int().min(0).max(120).optional(),
  default_prep_hours: z.number().min(0.5).max(12).optional(),
  default_shopping_minutes: z.number().int().min(15).max(240).optional(),
  default_packing_minutes: z.number().int().min(10).max(120).optional(),

  target_margin_percent: z.number().min(0).max(100).optional(),
  target_monthly_revenue_cents: z.number().int().min(0).optional(),
  target_annual_revenue_cents: z.number().int().min(0).nullable().optional(),
  revenue_goal_program_enabled: z.boolean().optional(),
  revenue_goal_nudge_level: z.enum(['gentle', 'standard', 'aggressive']).optional(),
  revenue_goal_custom: z.array(RevenueGoalCustomSchema).optional(),

  shop_day_before: z.boolean().optional(),
  dashboard_widgets: z.array(DashboardWidgetPreferenceSchema).optional(),
  my_dashboard_widgets: z.array(z.string()).max(120).optional(),
  my_dashboard_notes: z.string().max(5000).optional(),
  my_dashboard_pinned_menu_id: z.string().uuid().nullable().optional(),
  primary_nav_hrefs: PrimaryNavHrefArraySchema.optional(),
})

export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>

// Type assertion helper — chef_preferences not in generated types until migration applied
function fromChefPreferences(supabase: any): any {
  return supabase.from('chef_preferences')
}

function normalizeStore(store: DefaultStore): DefaultStore {
  return {
    name: store.name.trim(),
    address: (store.address || '').trim(),
    place_id: store.place_id ?? null,
  }
}

function dedupeStores(stores: DefaultStore[]): DefaultStore[] {
  const seen = new Set<string>()
  const deduped: DefaultStore[] = []

  for (const raw of stores) {
    const store = normalizeStore(raw)
    if (!store.name) continue
    const key = `${store.name.toLowerCase()}|${store.address.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(store)
  }

  return deduped
}

function getStoreFromUnknown(value: unknown): DefaultStore | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  if (typeof item.name !== 'string' || !item.name.trim()) return null

  return normalizeStore({
    name: item.name,
    address: typeof item.address === 'string' ? item.address : '',
    place_id: typeof item.place_id === 'string' ? item.place_id : null,
  })
}

function buildDefaultStores(row: Record<string, unknown>): DefaultStore[] {
  const stores: DefaultStore[] = []

  const groceryStore = row.default_grocery_store
  if (typeof groceryStore === 'string' && groceryStore.trim()) {
    stores.push({
      name: groceryStore,
      address: typeof row.default_grocery_address === 'string' ? row.default_grocery_address : '',
      place_id: null,
    })
  }

  const liquorStore = row.default_liquor_store
  if (typeof liquorStore === 'string' && liquorStore.trim()) {
    stores.push({
      name: liquorStore,
      address: typeof row.default_liquor_address === 'string' ? row.default_liquor_address : '',
      place_id: null,
    })
  }

  const specialtyStores = row.default_specialty_stores
  if (Array.isArray(specialtyStores)) {
    for (const entry of specialtyStores) {
      const parsed = getStoreFromUnknown(entry)
      if (parsed) stores.push(parsed)
    }
  }

  return dedupeStores(stores)
}

function sanitizeRevenueGoalCustom(input: RevenueGoalCustom[]): RevenueGoalCustom[] {
  const seen = new Set<string>()
  const normalized: RevenueGoalCustom[] = []

  for (const goal of input) {
    if (seen.has(goal.id)) continue
    seen.add(goal.id)
    normalized.push({
      ...goal,
      label: goal.label.trim(),
      target_cents: Math.max(0, Math.round(goal.target_cents)),
    })
  }

  return normalized
}

function getRevenueGoalCustomFromUnknown(value: unknown): RevenueGoalCustom[] {
  if (!Array.isArray(value)) return []

  const parsed = z.array(RevenueGoalCustomSchema).safeParse(value)
  if (!parsed.success) return []

  return sanitizeRevenueGoalCustom(parsed.data)
}

function getDefaultDashboardWidgets(): DashboardWidgetPreference[] {
  return DEFAULT_DASHBOARD_WIDGETS.map((widget) => ({ ...widget }))
}

function sanitizeDashboardWidgets(input: DashboardWidgetPreference[]): DashboardWidgetPreference[] {
  const seen = new Set<DashboardWidgetPreference['id']>()
  const ordered: DashboardWidgetPreference[] = []

  for (const widget of input) {
    if (seen.has(widget.id)) continue
    seen.add(widget.id)
    ordered.push({ id: widget.id, enabled: widget.enabled })
  }

  for (const fallbackWidget of DEFAULT_DASHBOARD_WIDGETS) {
    if (seen.has(fallbackWidget.id)) continue
    ordered.push({ ...fallbackWidget })
  }

  return ordered
}

function getDashboardWidgetsFromUnknown(value: unknown): DashboardWidgetPreference[] {
  if (!Array.isArray(value)) return getDefaultDashboardWidgets()

  const parsed = z.array(DashboardWidgetPreferenceSchema).safeParse(value)
  if (!parsed.success) return getDefaultDashboardWidgets()

  return sanitizeDashboardWidgets(parsed.data)
}

function sanitizePrimaryNavHrefs(input: string[]): string[] {
  const seen = new Set<string>()
  const hrefs: string[] = []

  for (const rawHref of input) {
    const href = rawHref.trim()
    if (!href || !href.startsWith('/')) continue
    if (seen.has(href)) continue
    seen.add(href)
    hrefs.push(href)
  }

  return hrefs
}

function getPrimaryNavHrefsFromUnknown(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  const parsed = PrimaryNavHrefArraySchema.safeParse(value)
  if (!parsed.success) return []

  return sanitizePrimaryNavHrefs(parsed.data)
}

// ============================================
// QUERIES
// ============================================

/**
 * Get chef preferences, creating defaults if none exist.
 */
export async function getChefPreferences(): Promise<ChefPreferences> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await fromChefPreferences(supabase)
    .select('*')
    .eq('chef_id', user.entityId)
    .single()

  if (error || !data) {
    return {
      id: '',
      chef_id: user.entityId,
      ...DEFAULT_PREFERENCES,
    }
  }

  const row = data as Record<string, unknown>
  const defaultStores = buildDefaultStores(row)

  return {
    id: row.id as string,
    chef_id: row.chef_id as string,
    home_address: (row.home_address as string) ?? null,
    home_city: (row.home_city as string) ?? null,
    home_state: (row.home_state as string) ?? null,
    home_zip: (row.home_zip as string) ?? null,
    default_stores: defaultStores,
    default_grocery_store: (row.default_grocery_store as string) ?? null,
    default_grocery_address: (row.default_grocery_address as string) ?? null,
    default_liquor_store: (row.default_liquor_store as string) ?? null,
    default_liquor_address: (row.default_liquor_address as string) ?? null,
    default_specialty_stores: defaultStores,
    default_buffer_minutes: (row.default_buffer_minutes as number) ?? 30,
    default_prep_hours: Number(row.default_prep_hours ?? 3),
    default_shopping_minutes: (row.default_shopping_minutes as number) ?? 60,
    default_packing_minutes: (row.default_packing_minutes as number) ?? 30,
    target_margin_percent: Number(row.target_margin_percent ?? 60),
    target_monthly_revenue_cents: Number(row.target_monthly_revenue_cents ?? 1000000),
    target_annual_revenue_cents:
      row.target_annual_revenue_cents == null ? null : Number(row.target_annual_revenue_cents),
    revenue_goal_program_enabled: (row.revenue_goal_program_enabled as boolean) ?? false,
    revenue_goal_nudge_level: (row.revenue_goal_nudge_level === 'standard' ||
    row.revenue_goal_nudge_level === 'aggressive'
      ? row.revenue_goal_nudge_level
      : 'gentle') as ChefPreferences['revenue_goal_nudge_level'],
    revenue_goal_custom: getRevenueGoalCustomFromUnknown(row.revenue_goal_custom),
    shop_day_before: (row.shop_day_before as boolean) ?? true,
    dashboard_widgets: getDashboardWidgetsFromUnknown(row.dashboard_widgets),
    my_dashboard_widgets: Array.isArray(row.my_dashboard_widgets)
      ? (row.my_dashboard_widgets as string[]).filter((id) =>
          DASHBOARD_WIDGET_IDS.includes(id as any)
        )
      : [],
    my_dashboard_notes: typeof row.my_dashboard_notes === 'string' ? row.my_dashboard_notes : '',
    my_dashboard_pinned_menu_id:
      typeof row.my_dashboard_pinned_menu_id === 'string' ? row.my_dashboard_pinned_menu_id : null,
    primary_nav_hrefs: getPrimaryNavHrefsFromUnknown(row.primary_nav_hrefs),
  }
}

export async function getChefPrimaryNavHrefs(): Promise<string[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await fromChefPreferences(supabase)
    .select('primary_nav_hrefs')
    .eq('chef_id', user.entityId)
    .single()

  if (error || !data) return []

  const row = data as Record<string, unknown>
  return getPrimaryNavHrefsFromUnknown(row.primary_nav_hrefs)
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Update chef preferences (upsert — creates if not exists).
 */
export async function updateChefPreferences(input: UpdatePreferencesInput) {
  const user = await requireChef()
  const validated = UpdatePreferencesSchema.parse(input)
  const payload: Record<string, unknown> = { ...validated }

  if (validated.default_stores) {
    const stores = dedupeStores(validated.default_stores)
    payload.default_specialty_stores = stores
    payload.default_grocery_store = null
    payload.default_grocery_address = null
    payload.default_liquor_store = null
    payload.default_liquor_address = null
  } else if (validated.default_specialty_stores) {
    payload.default_specialty_stores = dedupeStores(validated.default_specialty_stores)
  }

  if (validated.revenue_goal_custom) {
    payload.revenue_goal_custom = sanitizeRevenueGoalCustom(validated.revenue_goal_custom)
  }

  if (validated.dashboard_widgets) {
    payload.dashboard_widgets = sanitizeDashboardWidgets(validated.dashboard_widgets)
  }

  if (validated.my_dashboard_widgets) {
    // Dedupe and validate widget IDs
    const seen = new Set<string>()
    payload.my_dashboard_widgets = validated.my_dashboard_widgets.filter((id) => {
      if (seen.has(id)) return false
      seen.add(id)
      return DASHBOARD_WIDGET_IDS.includes(id as any)
    })
  }

  if (validated.primary_nav_hrefs) {
    payload.primary_nav_hrefs = sanitizePrimaryNavHrefs(validated.primary_nav_hrefs)
  }

  delete payload.default_stores

  const supabase: any = createServerClient()

  // Check if preferences exist
  const { data: existing } = await fromChefPreferences(supabase)
    .select('id')
    .eq('chef_id', user.entityId)
    .single()

  if (existing) {
    const { error } = await fromChefPreferences(supabase)
      .update(payload)
      .eq('chef_id', user.entityId)

    if (error) {
      console.error('[updateChefPreferences] Update error:', error)
      throw new Error('Failed to update preferences')
    }
  } else {
    const { error } = await fromChefPreferences(supabase).insert({
      chef_id: user.entityId,
      tenant_id: user.tenantId!,
      ...payload,
    })

    if (error) {
      console.error('[updateChefPreferences] Insert error:', error)
      throw new Error('Failed to save preferences')
    }
  }

  revalidatePath('/settings')
  revalidatePath('/settings/navigation')
  revalidatePath('/dashboard')
  revalidateTag(`chef-layout-${user.entityId}`)
  return { success: true }
}

// ============================================
// EVENT LOCK-IN
// ============================================

/**
 * Lock in to a specific event. Filters the nav to event-relevant sections only.
 */
export async function lockInToEvent(eventId: string) {
  const user = await requireChef()
  const parsed = z.string().uuid().safeParse(eventId)
  if (!parsed.success) throw new Error('Invalid event ID')

  const supabase: any = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', parsed.data)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  const { data: existing } = await fromChefPreferences(supabase)
    .select('id')
    .eq('chef_id', user.entityId)
    .single()

  if (existing) {
    const { error } = await fromChefPreferences(supabase)
      .update({ locked_event_id: parsed.data })
      .eq('chef_id', user.entityId)
    if (error) throw new Error('Failed to lock in to event')
  } else {
    const { error } = await fromChefPreferences(supabase).insert({
      chef_id: user.entityId,
      tenant_id: user.tenantId!,
      locked_event_id: parsed.data,
    })
    if (error) throw new Error('Failed to lock in to event')
  }

  revalidateTag(`chef-layout-${user.entityId}`)
  revalidatePath('/events')
  return { success: true }
}

/**
 * Exit event lock-in. Restores the full navigation.
 */
export async function unlockEvent() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await fromChefPreferences(supabase)
    .update({ locked_event_id: null })
    .eq('chef_id', user.entityId)

  if (error) throw new Error('Failed to unlock event')

  revalidateTag(`chef-layout-${user.entityId}`)
  revalidatePath('/events')
  return { success: true }
}

// ============================================
// BUSINESS MODE
// ============================================

/**
 * Returns current business mode state and optional business fields.
 * Defaults to is_business=false if not yet set.
 */
export async function getBusinessMode(): Promise<{
  is_business: boolean
  business_legal_name: string | null
  business_address: string | null
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await fromChefPreferences(supabase)
    .select('is_business, business_legal_name, business_address')
    .eq('chef_id', user.entityId)
    .single()

  return {
    is_business: (data as any)?.is_business ?? false,
    business_legal_name: (data as any)?.business_legal_name ?? null,
    business_address: (data as any)?.business_address ?? null,
  }
}

/**
 * Toggle business mode on or off. When enabling, optional fields can be set.
 */
export async function setBusinessMode(input: {
  is_business: boolean
  business_legal_name?: string | null
  business_address?: string | null
}) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const payload: Record<string, unknown> = {
    is_business: input.is_business,
  }
  if ('business_legal_name' in input)
    payload.business_legal_name = input.business_legal_name?.trim() || null
  if ('business_address' in input) payload.business_address = input.business_address?.trim() || null

  const { data: existing } = await fromChefPreferences(supabase)
    .select('id')
    .eq('chef_id', user.entityId)
    .single()

  if (existing) {
    const { error } = await fromChefPreferences(supabase)
      .update(payload)
      .eq('chef_id', user.entityId)
    if (error) throw new Error('Failed to update business mode')
  } else {
    const { error } = await fromChefPreferences(supabase).insert({
      chef_id: user.entityId,
      tenant_id: user.tenantId!,
      ...payload,
    })
    if (error) throw new Error('Failed to save business mode')
  }

  revalidatePath('/settings')
  return { success: true }
}
