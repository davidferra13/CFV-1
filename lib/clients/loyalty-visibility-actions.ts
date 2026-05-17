'use server'

// Loyalty Visibility Actions
// Client-facing read-only actions for loyalty tier, progress, perks, and badges.
// These are consumed by client portal UI. No mutations.

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'
import { unstable_cache } from 'next/cache'
import type { LoyaltyTierName, LoyaltyPerk, TierConfig } from './loyalty-types'
import { DEFAULT_TIER_PERKS } from './loyalty-types'
import type {
  ClientLoyaltyView,
  LoyaltyPerkRedemption,
  TierProgressBar,
  LoyaltyBadgeData,
} from './loyalty-visibility-types'
import { TIER_COLORS, TIER_LABELS } from './loyalty-visibility-types'

// =====================================================================================
// SHARED HELPERS (duplicated from loyalty-actions to avoid cross-module 'use server' issues)
// =====================================================================================

const TIER_ORDER: LoyaltyTierName[] = ['bronze', 'silver', 'gold', 'platinum']

const DEFAULT_TIER_THRESHOLDS: Record<
  LoyaltyTierName,
  { minEvents: number; minSpendCents: number; discountPercent: number }
> = {
  bronze: { minEvents: 0, minSpendCents: 0, discountPercent: 0 },
  silver: { minEvents: 3, minSpendCents: 50000, discountPercent: 5 },
  gold: { minEvents: 8, minSpendCents: 150000, discountPercent: 10 },
  platinum: { minEvents: 15, minSpendCents: 300000, discountPercent: 15 },
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

async function loadTierConfigs(db: any, tenantId: string): Promise<TierConfig[]> {
  const { data } = await db
    .from('chef_loyalty_configs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('min_events', { ascending: true })

  if (data && data.length > 0) {
    return data.map(mapConfigRow)
  }

  // Return defaults without seeding (client-facing actions are read-only)
  return TIER_ORDER.map((tier) => ({
    id: '',
    tenantId,
    tier,
    minEvents: DEFAULT_TIER_THRESHOLDS[tier].minEvents,
    minSpendCents: DEFAULT_TIER_THRESHOLDS[tier].minSpendCents,
    discountPercent: DEFAULT_TIER_THRESHOLDS[tier].discountPercent,
    perksJson: DEFAULT_TIER_PERKS[tier],
    createdAt: '',
  }))
}

function computeTier(
  totalEvents: number,
  totalSpendCents: number,
  configs: TierConfig[]
): LoyaltyTierName {
  for (let i = TIER_ORDER.length - 1; i >= 0; i--) {
    const tierName = TIER_ORDER[i]
    const cfg = configs.find((c) => c.tier === tierName)
    const minEvents = cfg?.minEvents ?? DEFAULT_TIER_THRESHOLDS[tierName].minEvents
    const minSpend = cfg?.minSpendCents ?? DEFAULT_TIER_THRESHOLDS[tierName].minSpendCents
    if (totalEvents >= minEvents || totalSpendCents >= minSpend) {
      return tierName
    }
  }
  return 'bronze'
}

function daysBetween(dateStr: string | null): number {
  if (!dateStr) return 0
  const then = new Date(dateStr)
  const now = new Date()
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)))
}

function buildProgressBar(
  currentTier: LoyaltyTierName,
  totalEvents: number,
  totalSpendCents: number,
  configs: TierConfig[]
): TierProgressBar {
  const idx = TIER_ORDER.indexOf(currentTier)
  const isMax = idx >= TIER_ORDER.length - 1

  if (isMax) {
    return {
      currentTier,
      nextTier: null,
      progressPercent: 100,
      eventsCompleted: totalEvents,
      eventsRequired: null,
      spendCents: totalSpendCents,
      spendRequiredCents: null,
    }
  }

  const nextTierName = TIER_ORDER[idx + 1]
  const cfg = configs.find((c) => c.tier === nextTierName)
  const eventsRequired = cfg?.minEvents ?? DEFAULT_TIER_THRESHOLDS[nextTierName].minEvents
  const spendRequired = cfg?.minSpendCents ?? DEFAULT_TIER_THRESHOLDS[nextTierName].minSpendCents

  const eventProgress =
    eventsRequired > 0 ? Math.min(100, Math.round((totalEvents / eventsRequired) * 100)) : 100
  const spendProgress =
    spendRequired > 0 ? Math.min(100, Math.round((totalSpendCents / spendRequired) * 100)) : 100

  // Average of both progress metrics, capped at 100
  const progressPercent = Math.min(100, Math.round((eventProgress + spendProgress) / 2))

  return {
    currentTier,
    nextTier: nextTierName,
    progressPercent,
    eventsCompleted: totalEvents,
    eventsRequired,
    spendCents: totalSpendCents,
    spendRequiredCents: spendRequired,
  }
}

// =====================================================================================
// 1. getMyLoyaltyStatus - Full client-facing loyalty view
// =====================================================================================

export async function getMyLoyaltyStatus(
  clientId: string,
  tenantId: string
): Promise<ClientLoyaltyView | null> {
  const user = await requireClient()

  // Auth guard: client can only view their own data
  if (user.entityId !== clientId || user.tenantId !== tenantId) {
    return null
  }

  const db: any = createServerClient()

  try {
    // Fetch client record
    const { data: client } = await db
      .from('clients')
      .select(
        'id, loyalty_points, loyalty_tier, total_events_completed, first_event_date, lifetime_value_cents'
      )
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .single()

    if (!client) return null

    const configs = await loadTierConfigs(db, tenantId)

    // Compute spend from ledger for accuracy
    const { data: spendData } = await db
      .from('ledger_entries')
      .select('amount_cents')
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId)

    const totalSpendCents = (spendData || []).reduce(
      (sum: number, row: any) => sum + Math.abs(row.amount_cents || 0),
      0
    )

    const totalEvents = client.total_events_completed || 0
    const currentTier = computeTier(totalEvents, totalSpendCents, configs)
    const tierConfig = configs.find((c) => c.tier === currentTier)
    const availablePerks = tierConfig?.perksJson ?? DEFAULT_TIER_PERKS[currentTier] ?? []
    const discountPercent =
      tierConfig?.discountPercent ?? DEFAULT_TIER_THRESHOLDS[currentTier].discountPercent

    const progress = buildProgressBar(currentTier, totalEvents, totalSpendCents, configs)

    // Fetch redemption history
    const redemptionHistory = await fetchRedemptions(db, clientId, tenantId)

    return {
      tier: currentTier,
      tierLabel: TIER_LABELS[currentTier],
      tierColor: TIER_COLORS[currentTier],
      totalEvents,
      totalSpendCents,
      tenureDays: daysBetween(client.first_event_date),
      pointsBalance: client.loyalty_points || 0,
      availablePerks,
      discountPercent,
      progress,
      redemptionHistory,
    }
  } catch (err) {
    console.error('[getMyLoyaltyStatus] Error:', err)
    return null
  }
}

// =====================================================================================
// 2. getMyPerkHistory - Past perk redemptions from ledger entries
// =====================================================================================

export async function getMyPerkHistory(
  clientId: string,
  tenantId: string
): Promise<LoyaltyPerkRedemption[]> {
  const user = await requireClient()

  if (user.entityId !== clientId || user.tenantId !== tenantId) {
    return []
  }

  const db: any = createServerClient()

  try {
    return await fetchRedemptions(db, clientId, tenantId)
  } catch (err) {
    console.error('[getMyPerkHistory] Error:', err)
    return []
  }
}

async function fetchRedemptions(
  db: any,
  clientId: string,
  tenantId: string
): Promise<LoyaltyPerkRedemption[]> {
  // Loyalty-related ledger entries (credits from loyalty discounts/perks)
  const { data: ledgerRows } = await db
    .from('ledger_entries')
    .select('id, created_at, event_id, amount_cents, description, internal_notes')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .eq('entry_type', 'credit')
    .ilike('description', '%Loyalty%')
    .order('created_at', { ascending: false })

  if (!ledgerRows || ledgerRows.length === 0) return []

  return ledgerRows.map((row: any) => {
    // Extract perk key and label from description when possible
    const desc = row.description || ''
    const perkKey = extractPerkKey(desc)
    const perkLabel = extractPerkLabel(desc)

    return {
      id: row.id,
      perkKey,
      perkLabel,
      redeemedAt: row.created_at,
      eventId: row.event_id || null,
      amountCents: Math.abs(row.amount_cents || 0),
      description: desc,
    }
  })
}

function extractPerkKey(description: string): string {
  // "Loyalty gold tier discount (10%)" -> "tier_discount"
  if (description.toLowerCase().includes('discount')) return 'tier_discount'
  if (description.toLowerCase().includes('complimentary')) return 'complimentary_course'
  if (description.toLowerCase().includes('bonus')) return 'loyalty_bonus'
  return 'loyalty_perk'
}

function extractPerkLabel(description: string): string {
  // Use the description itself as the label, cleaning up if needed
  return description.replace(/^Loyalty\s*/i, '').trim() || 'Loyalty perk'
}

// =====================================================================================
// 3. getMyTierProgress - Detailed progress toward next tier
// =====================================================================================

export async function getMyTierProgress(
  clientId: string,
  tenantId: string
): Promise<TierProgressBar | null> {
  const user = await requireClient()

  if (user.entityId !== clientId || user.tenantId !== tenantId) {
    return null
  }

  const db: any = createServerClient()

  try {
    const { data: client } = await db
      .from('clients')
      .select('id, total_events_completed, lifetime_value_cents')
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .single()

    if (!client) return null

    const configs = await loadTierConfigs(db, tenantId)

    // Accurate spend from ledger
    const { data: spendData } = await db
      .from('ledger_entries')
      .select('amount_cents')
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId)

    const totalSpendCents = (spendData || []).reduce(
      (sum: number, row: any) => sum + Math.abs(row.amount_cents || 0),
      0
    )

    const totalEvents = client.total_events_completed || 0
    const currentTier = computeTier(totalEvents, totalSpendCents, configs)

    return buildProgressBar(currentTier, totalEvents, totalSpendCents, configs)
  } catch (err) {
    console.error('[getMyTierProgress] Error:', err)
    return null
  }
}

// =====================================================================================
// 4. getLoyaltyBadgeData - Lightweight badge for client portal header (cached 5 min)
// =====================================================================================

export async function getLoyaltyBadgeData(
  clientId: string,
  tenantId: string
): Promise<LoyaltyBadgeData> {
  const user = await requireClient()

  if (user.entityId !== clientId || user.tenantId !== tenantId) {
    return null
  }

  return getCachedBadgeData(clientId, tenantId)()
}

function getCachedBadgeData(clientId: string, tenantId: string) {
  return unstable_cache(
    async (): Promise<LoyaltyBadgeData> => {
      const db: any = createAdminClient()

      try {
        const { data: client } = await db
          .from('clients')
          .select('loyalty_tier')
          .eq('id', clientId)
          .eq('tenant_id', tenantId)
          .single()

        if (!client) return null

        const tier = (client.loyalty_tier || 'bronze') as LoyaltyTierName

        return {
          tier,
          tierLabel: TIER_LABELS[tier],
          tierColor: TIER_COLORS[tier],
        }
      } catch (err) {
        console.error('[getCachedBadgeData] Error:', err)
        return null
      }
    },
    [`loyalty-badge-${clientId}-${tenantId}`],
    { revalidate: 300, tags: [`loyalty-badge-${clientId}`] }
  )
}
