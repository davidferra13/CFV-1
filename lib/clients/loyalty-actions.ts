'use server'

// Loyalty Tier Server Actions
// Chef-configurable tier system with perks, discounts, and overview dashboard.
// Complements the existing points/rewards system in lib/loyalty/actions.ts.
// This module focuses on tier configuration, per-client profiles, and chef overview.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type {
  LoyaltyTierName,
  LoyaltyPerk,
  TierConfig,
  LoyaltyProfile,
  ChefLoyaltyOverviewEntry,
} from './loyalty-types'
import { DEFAULT_TIER_PERKS } from './loyalty-types'

// =====================================================================================
// VALIDATION
// =====================================================================================

const SetLoyaltyPerksSchema = z.object({
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum']),
  minEvents: z.number().int().nonnegative().optional(),
  minSpendCents: z.number().int().nonnegative().optional(),
  discountPercent: z.number().int().min(0).max(100).optional(),
  perks: z.array(
    z.object({
      key: z.string().min(1),
      label: z.string().min(1),
      description: z.string().min(1),
    })
  ),
})

// =====================================================================================
// HELPERS
// =====================================================================================

const TIER_ORDER: LoyaltyTierName[] = ['bronze', 'silver', 'gold', 'platinum']

/** Default tier thresholds when no chef_loyalty_configs rows exist */
const DEFAULT_TIER_THRESHOLDS: Record<
  LoyaltyTierName,
  { minEvents: number; minSpendCents: number; discountPercent: number }
> = {
  bronze: { minEvents: 0, minSpendCents: 0, discountPercent: 0 },
  silver: { minEvents: 3, minSpendCents: 50000, discountPercent: 5 },
  gold: { minEvents: 8, minSpendCents: 150000, discountPercent: 10 },
  platinum: { minEvents: 15, minSpendCents: 300000, discountPercent: 15 },
}

function computeTierFromHistory(
  totalEvents: number,
  totalSpendCents: number,
  configs: TierConfig[]
): LoyaltyTierName {
  // Walk tiers top-down; first match wins
  for (let i = TIER_ORDER.length - 1; i >= 0; i--) {
    const tierName = TIER_ORDER[i]
    const cfg = configs.find((c) => c.tier === tierName)
    const minEvents = cfg?.minEvents ?? DEFAULT_TIER_THRESHOLDS[tierName].minEvents
    const minSpend = cfg?.minSpendCents ?? DEFAULT_TIER_THRESHOLDS[tierName].minSpendCents
    // Client qualifies if they meet EITHER threshold (events OR spend)
    if (totalEvents >= minEvents || totalSpendCents >= minSpend) {
      return tierName
    }
  }
  return 'bronze'
}

function getNextTierInfo(
  currentTier: LoyaltyTierName,
  totalEvents: number,
  totalSpendCents: number,
  configs: TierConfig[]
): { nextTier: LoyaltyTierName; eventsNeeded: number; spendNeededCents: number } | null {
  const idx = TIER_ORDER.indexOf(currentTier)
  if (idx >= TIER_ORDER.length - 1) return null
  const nextTierName = TIER_ORDER[idx + 1]
  const cfg = configs.find((c) => c.tier === nextTierName)
  const minEvents = cfg?.minEvents ?? DEFAULT_TIER_THRESHOLDS[nextTierName].minEvents
  const minSpend = cfg?.minSpendCents ?? DEFAULT_TIER_THRESHOLDS[nextTierName].minSpendCents
  return {
    nextTier: nextTierName,
    eventsNeeded: Math.max(0, minEvents - totalEvents),
    spendNeededCents: Math.max(0, minSpend - totalSpendCents),
  }
}

async function ensureTierConfigsExist(tenantId: string): Promise<TierConfig[]> {
  const db: any = createServerClient()
  const { data: existing } = await db
    .from('chef_loyalty_configs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('min_events', { ascending: true })

  if (existing && existing.length > 0) {
    return existing.map(mapConfigRow)
  }

  // Seed defaults
  const rows = TIER_ORDER.map((tier) => ({
    tenant_id: tenantId,
    tier,
    min_events: DEFAULT_TIER_THRESHOLDS[tier].minEvents,
    min_spend_cents: DEFAULT_TIER_THRESHOLDS[tier].minSpendCents,
    discount_percent: DEFAULT_TIER_THRESHOLDS[tier].discountPercent,
    perks_json: DEFAULT_TIER_PERKS[tier],
  }))

  const { data: inserted, error } = await db
    .from('chef_loyalty_configs')
    .insert(rows)
    .select()

  if (error) {
    console.error('[ensureTierConfigsExist] Seed error:', error)
    throw new Error('Failed to initialize loyalty tier configurations')
  }

  return (inserted || []).map(mapConfigRow)
}

function mapConfigRow(row: any): TierConfig {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    tier: row.tier as LoyaltyTierName,
    minEvents: row.min_events ?? 0,
    minSpendCents: row.min_spend_cents ?? 0,
    discountPercent: row.discount_percent ?? 0,
    perksJson: (row.perks_json ?? []) as LoyaltyPerk[],
    createdAt: row.created_at,
  }
}

function daysBetween(dateStr: string | null): number {
  if (!dateStr) return 0
  const then = new Date(dateStr)
  const now = new Date()
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)))
}

// =====================================================================================
// 1. getClientLoyaltyProfile - Full loyalty profile for a single client
// =====================================================================================

export async function getClientLoyaltyProfile(clientId: string): Promise<LoyaltyProfile> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: client, error: clientErr } = await db
    .from('clients')
    .select(
      'id, full_name, loyalty_points, loyalty_tier, total_events_completed, total_guests_served, first_event_date, lifetime_value_cents'
    )
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (clientErr || !client) {
    throw new Error('Client not found')
  }

  const configs = await ensureTierConfigsExist(user.tenantId!)

  // Compute total spend from ledger for accuracy
  const { data: spendData } = await db
    .from('ledger_entries')
    .select('amount_cents')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)

  const totalSpendCents = (spendData || []).reduce(
    (sum: number, row: any) => sum + Math.abs(row.amount_cents || 0),
    0
  )

  const totalEvents = client.total_events_completed || 0
  const computedTier = computeTierFromHistory(totalEvents, totalSpendCents, configs)
  const tierConfig = configs.find((c) => c.tier === computedTier)
  const perksUnlocked = tierConfig?.perksJson ?? DEFAULT_TIER_PERKS[computedTier] ?? []

  // Lifetime earned points
  const { data: earnedRows } = await db
    .from('loyalty_transactions')
    .select('points')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .in('type', ['earned', 'bonus'])

  const lifetimePointsEarned = (earnedRows || []).reduce(
    (sum: number, row: any) => sum + (row.points || 0),
    0
  )

  const nextInfo = getNextTierInfo(computedTier, totalEvents, totalSpendCents, configs)

  return {
    clientId: client.id,
    clientName: client.full_name || 'Unknown',
    tier: computedTier,
    totalEvents,
    totalSpendCents,
    tenureDays: daysBetween(client.first_event_date),
    pointsBalance: client.loyalty_points || 0,
    lifetimePointsEarned,
    perksUnlocked,
    nextTier: nextInfo?.nextTier ?? null,
    eventsToNextTier: nextInfo?.eventsNeeded ?? null,
    spendToNextTierCents: nextInfo?.spendNeededCents ?? null,
  }
}

// =====================================================================================
// 2. calculateLoyaltyTier - Compute tier from event history
// =====================================================================================

export async function calculateLoyaltyTier(
  clientId: string
): Promise<{ tier: LoyaltyTierName; changed: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: client } = await db
    .from('clients')
    .select('id, loyalty_tier, total_events_completed, lifetime_value_cents')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) throw new Error('Client not found')

  const configs = await ensureTierConfigsExist(user.tenantId!)

  // Use ledger for accurate spend
  const { data: spendData } = await db
    .from('ledger_entries')
    .select('amount_cents')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)

  const totalSpendCents = (spendData || []).reduce(
    (sum: number, row: any) => sum + Math.abs(row.amount_cents || 0),
    0
  )

  const totalEvents = client.total_events_completed || 0
  const newTier = computeTierFromHistory(totalEvents, totalSpendCents, configs)
  const oldTier = (client.loyalty_tier || 'bronze') as LoyaltyTierName
  const changed = newTier !== oldTier

  if (changed) {
    await db
      .from('clients')
      .update({ loyalty_tier: newTier })
      .eq('id', clientId)
      .eq('tenant_id', user.tenantId!)

    revalidatePath(`/clients/${clientId}`)
    revalidatePath('/loyalty')
  }

  return { tier: newTier, changed }
}

// =====================================================================================
// 3. getLoyaltyPerks - What perks a given tier unlocks
// =====================================================================================

export async function getLoyaltyPerks(tier: LoyaltyTierName): Promise<LoyaltyPerk[]> {
  const user = await requireChef()
  const configs = await ensureTierConfigsExist(user.tenantId!)
  const config = configs.find((c) => c.tier === tier)
  return config?.perksJson ?? DEFAULT_TIER_PERKS[tier] ?? []
}

// =====================================================================================
// 4. applyLoyaltyDiscount - Apply tier-based discount to an event
// =====================================================================================

export async function applyLoyaltyDiscount(
  eventId: string
): Promise<{ success: boolean; discountPercent: number; discountCents: number; tier: LoyaltyTierName }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('id, client_id, total_price_cents')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  const { data: client } = await db
    .from('clients')
    .select('id, loyalty_tier, total_events_completed, lifetime_value_cents')
    .eq('id', event.client_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) throw new Error('Client not found')

  const configs = await ensureTierConfigsExist(user.tenantId!)

  // Use ledger for accurate spend
  const { data: spendData } = await db
    .from('ledger_entries')
    .select('amount_cents')
    .eq('client_id', event.client_id)
    .eq('tenant_id', user.tenantId!)

  const totalSpendCents = (spendData || []).reduce(
    (sum: number, row: any) => sum + Math.abs(row.amount_cents || 0),
    0
  )

  const totalEvents = client.total_events_completed || 0
  const tier = computeTierFromHistory(totalEvents, totalSpendCents, configs)
  const tierConfig = configs.find((c) => c.tier === tier)
  const discountPercent = tierConfig?.discountPercent ?? DEFAULT_TIER_THRESHOLDS[tier].discountPercent

  if (discountPercent <= 0) {
    return { success: true, discountPercent: 0, discountCents: 0, tier }
  }

  const totalCents = event.total_price_cents || 0
  const discountCents = Math.round((totalCents * discountPercent) / 100)

  // Record discount as a ledger credit
  try {
    const { appendLedgerEntryInternal } = await import('@/lib/ledger/append-internal')
    await appendLedgerEntryInternal({
      tenant_id: user.tenantId!,
      client_id: event.client_id,
      event_id: eventId,
      entry_type: 'credit',
      amount_cents: -discountCents,
      payment_method: 'cash',
      description: `Loyalty ${tier} tier discount (${discountPercent}%)`,
      internal_notes: `Automatic tier-based discount`,
      created_by: user.id,
    })
  } catch (err) {
    console.error('[applyLoyaltyDiscount] Ledger entry failed:', err)
    throw new Error('Failed to apply loyalty discount')
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/clients/${event.client_id}`)

  return { success: true, discountPercent, discountCents, tier }
}

// =====================================================================================
// 5. getChefLoyaltyOverview - All clients with loyalty tiers for dashboard
// =====================================================================================

export async function getChefLoyaltyOverview(): Promise<{
  clients: ChefLoyaltyOverviewEntry[]
  tierCounts: Record<LoyaltyTierName, number>
  configs: TierConfig[]
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const configs = await ensureTierConfigsExist(user.tenantId!)

  const { data: allClients } = await db
    .from('clients')
    .select(
      'id, full_name, loyalty_points, loyalty_tier, total_events_completed, lifetime_value_cents, first_event_date, last_event_date'
    )
    .eq('tenant_id', user.tenantId!)
    .order('loyalty_tier', { ascending: false })

  const tierCounts: Record<LoyaltyTierName, number> = {
    bronze: 0,
    silver: 0,
    gold: 0,
    platinum: 0,
  }

  const entries: ChefLoyaltyOverviewEntry[] = (allClients || []).map((c: any) => {
    const tier = (c.loyalty_tier || 'bronze') as LoyaltyTierName
    tierCounts[tier]++

    return {
      clientId: c.id,
      clientName: c.full_name || 'Unknown',
      tier,
      totalEvents: c.total_events_completed || 0,
      totalSpendCents: c.lifetime_value_cents || 0,
      tenureDays: daysBetween(c.first_event_date),
      pointsBalance: c.loyalty_points || 0,
      lastEventDate: c.last_event_date || null,
    }
  })

  return { clients: entries, tierCounts, configs }
}

// =====================================================================================
// 6. setLoyaltyPerks - Chef configures perks and thresholds for a tier
// =====================================================================================

export async function setLoyaltyPerks(
  tier: LoyaltyTierName,
  perks: LoyaltyPerk[],
  options?: { minEvents?: number; minSpendCents?: number; discountPercent?: number }
): Promise<{ success: boolean; config: TierConfig }> {
  const user = await requireChef()

  const validated = SetLoyaltyPerksSchema.parse({
    tier,
    minEvents: options?.minEvents,
    minSpendCents: options?.minSpendCents,
    discountPercent: options?.discountPercent,
    perks,
  })

  const db: any = createServerClient()

  // Ensure configs exist
  await ensureTierConfigsExist(user.tenantId!)

  const updatePayload: Record<string, any> = {
    perks_json: validated.perks,
  }
  if (validated.minEvents !== undefined) updatePayload.min_events = validated.minEvents
  if (validated.minSpendCents !== undefined) updatePayload.min_spend_cents = validated.minSpendCents
  if (validated.discountPercent !== undefined) updatePayload.discount_percent = validated.discountPercent

  const { data: updated, error } = await db
    .from('chef_loyalty_configs')
    .update(updatePayload)
    .eq('tenant_id', user.tenantId!)
    .eq('tier', validated.tier)
    .select()
    .single()

  if (error || !updated) {
    console.error('[setLoyaltyPerks] Update error:', error)
    throw new Error('Failed to update tier configuration')
  }

  revalidatePath('/loyalty')
  revalidatePath('/settings')

  return { success: true, config: mapConfigRow(updated) }
}
