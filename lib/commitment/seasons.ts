import { createServerClient } from '@/lib/db/server'
import type { Season } from './seasons-types'
import { mapSeasonRow } from './seasons-types'
import type { CommitmentDomain, CommitmentSeason } from './types'

// Commitment Seasons (#27)
// Seasonal commitment profiles (peak, quiet, transition, custom).
// Auto-swap logic on season boundaries.

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export interface SeasonalProfile {
  season: CommitmentSeason
  label: string
  adjustments: SeasonalAdjustment[]
}

export interface SeasonalAdjustment {
  domain: CommitmentDomain
  frictionModifier: number // -2 to +2, applied to base friction tier
  reason: string
}

export interface SeasonHistoryEntry {
  id: string
  tenantId: string
  fromSeason: CommitmentSeason
  toSeason: CommitmentSeason
  switchedAt: Date
  autoTriggered: boolean
}

// Default seasonal profiles: how each season modifies commitment friction
const SEASON_PROFILES: Record<CommitmentSeason, SeasonalProfile> = {
  peak: {
    season: 'peak',
    label: 'Peak Season',
    adjustments: [
      { domain: 'scheduling', frictionModifier: 1, reason: 'High demand, protect rest days' },
      { domain: 'capacity', frictionModifier: 2, reason: 'Near max capacity, guard limits' },
      { domain: 'pricing', frictionModifier: 1, reason: 'No discounts during peak demand' },
      { domain: 'quality', frictionModifier: 0, reason: 'Quality standards unchanged' },
    ],
  },
  quiet: {
    season: 'quiet',
    label: 'Quiet Season',
    adjustments: [
      { domain: 'scheduling', frictionModifier: -1, reason: 'More flexibility with fewer events' },
      { domain: 'capacity', frictionModifier: -1, reason: 'Capacity is open' },
      { domain: 'pricing', frictionModifier: -1, reason: 'More pricing flexibility acceptable' },
      { domain: 'quality', frictionModifier: 0, reason: 'Quality standards unchanged' },
    ],
  },
  holiday: {
    season: 'holiday',
    label: 'Holiday Season',
    adjustments: [
      { domain: 'scheduling', frictionModifier: 2, reason: 'Protect personal time during holidays' },
      { domain: 'capacity', frictionModifier: 1, reason: 'Limited availability' },
      { domain: 'pricing', frictionModifier: 2, reason: 'Premium pricing enforced' },
      { domain: 'travel', frictionModifier: 1, reason: 'Travel logistics more complex' },
    ],
  },
  custom: {
    season: 'custom',
    label: 'Custom Season',
    adjustments: [],
  },
}

/**
 * Get the currently active season for a tenant.
 * Checks defined seasons in the DB, falls back to month-based defaults.
 */
export async function getActiveSeason(tenantId: string): Promise<{
  season: Season | null
  profile: SeasonalProfile
  currentMonth: number
}> {
  const client = createServerClient()
  const currentMonth = new Date().getMonth() + 1 // 1-12

  const { data: rows } = await client
    .from('commitment_seasons' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  const seasons: Season[] = (rows ?? []).map((r: any) => mapSeasonRow(r))

  // Find a season whose range includes the current month
  const activeSeason = seasons.find((s) => {
    if (s.startMonth <= s.endMonth) {
      return currentMonth >= s.startMonth && currentMonth <= s.endMonth
    }
    // Wrapping range (e.g., Nov-Feb: startMonth=11, endMonth=2)
    return currentMonth >= s.startMonth || currentMonth <= s.endMonth
  })

  if (activeSeason) {
    const seasonKey = activeSeason.seasonName as CommitmentSeason
    const profile = SEASON_PROFILES[seasonKey] ?? SEASON_PROFILES.custom
    return { season: activeSeason, profile, currentMonth }
  }

  // Default: derive season from month
  const defaultSeason = deriveSeasonFromMonth(currentMonth)
  return { season: null, profile: SEASON_PROFILES[defaultSeason], currentMonth }
}

/**
 * Get seasonal commitment adjustments for the current season.
 * Returns friction modifiers to apply to active commitments.
 */
export async function getSeasonalCommitments(
  tenantId: string
): Promise<SeasonalAdjustment[]> {
  const { profile } = await getActiveSeason(tenantId)
  return profile.adjustments
}

/**
 * Switch to a new season. Records the transition in history.
 */
export async function switchSeason(
  tenantId: string,
  toSeason: CommitmentSeason,
  autoTriggered: boolean = false
): Promise<SeasonHistoryEntry> {
  const client = createServerClient()
  const { profile: currentProfile } = await getActiveSeason(tenantId)

  const entry: SeasonHistoryEntry = {
    id: generateId(),
    tenantId,
    fromSeason: currentProfile.season,
    toSeason,
    switchedAt: new Date(),
    autoTriggered,
  }

  // Record the transition
  await client.from('commitment_season_history' as any).insert({
    id: entry.id,
    tenant_id: tenantId,
    from_season: entry.fromSeason,
    to_season: entry.toSeason,
    switched_at: entry.switchedAt.toISOString(),
    auto_triggered: autoTriggered,
  } as any)

  // Update all active commitments with the new seasonal profile
  await client
    .from('commitments' as any)
    .update({ seasonal_profile: toSeason, updated_at: new Date().toISOString() } as any)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  return entry
}

/**
 * Get season switch history for a tenant.
 */
export async function getSeasonHistory(
  tenantId: string,
  limit: number = 20
): Promise<SeasonHistoryEntry[]> {
  const client = createServerClient()

  const { data: rows } = await client
    .from('commitment_season_history' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('switched_at', { ascending: false })
    .limit(limit)

  return (rows ?? []).map((r: any) => ({
    id: r.id as string,
    tenantId: r.tenant_id as string,
    fromSeason: r.from_season as CommitmentSeason,
    toSeason: r.to_season as CommitmentSeason,
    switchedAt: new Date(r.switched_at as string),
    autoTriggered: r.auto_triggered as boolean,
  }))
}

/**
 * Check if the season should auto-swap based on current date.
 * Returns the new season if a swap is needed, null otherwise.
 */
export async function checkAutoSwap(tenantId: string): Promise<CommitmentSeason | null> {
  const { season, profile, currentMonth } = await getActiveSeason(tenantId)
  const derivedSeason = deriveSeasonFromMonth(currentMonth)

  // If we have a custom season defined, don't auto-swap
  if (season) return null

  // If the derived season differs from current profile, suggest swap
  if (derivedSeason !== profile.season) {
    return derivedSeason
  }

  return null
}

function deriveSeasonFromMonth(month: number): CommitmentSeason {
  // Peak: May-Sep (wedding/event season)
  if (month >= 5 && month <= 9) return 'peak'
  // Holiday: Nov-Dec
  if (month >= 11) return 'holiday'
  // Quiet: Jan-Mar
  if (month <= 3) return 'quiet'
  // Transition months (Apr, Oct) default to quiet
  return 'quiet'
}
