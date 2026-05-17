'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  TRUST_SIGNAL_WEIGHTS,
  DEFAULT_DISPLAY_CONFIG,
} from './trust-visual-types'
import type {
  TrustBadge,
  TrustDisplayConfig,
  TrustProfile,
  TrustProfileSummary,
  TrustSignal,
  TrustSignalEntry,
  TrustTier,
} from './trust-visual-types'

const TABLE = 'trust_profiles'

// ============================================
// 1. GET TRUST PROFILE
// ============================================

export async function getTrustProfile(chefId?: string): Promise<TrustProfile | null> {
  const user = await requireChef()
  const targetChefId = chefId ?? user.entityId
  const tenantId = user.tenantId!
  const db = createServerClient()

  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('chef_id', targetChefId)
    .maybeSingle()

  if (error) {
    console.error('[getTrustProfile] error:', error)
    return null
  }
  if (!data) return null

  return {
    id: data.id,
    tenantId: data.tenant_id,
    chefId: data.chef_id,
    badges: (data.badges ?? []) as TrustBadge[],
    signals: (data.signals ?? []) as TrustSignalEntry[],
    trustScore: data.trust_score ?? 0,
    verifiedAt: data.verified_at ?? null,
    displayConfig: {
      ...DEFAULT_DISPLAY_CONFIG,
      ...((data.display_config ?? {}) as Partial<TrustDisplayConfig>),
    },
  }
}

// ============================================
// 2. UPDATE TRUST SIGNAL
// ============================================

export async function updateTrustSignal(
  signal: TrustSignal,
  verified: boolean,
  value?: number | string,
  expiresAt?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const chefId = user.entityId
  const db = createServerClient()

  // Get or create profile
  let profile = await ensureProfile(db, tenantId, chefId)
  if (!profile) return { success: false, error: 'Failed to load trust profile' }

  const signals = (profile.signals ?? []) as TrustSignalEntry[]
  const now = new Date().toISOString()

  const entry: TrustSignalEntry = {
    signal,
    verified,
    ...(value !== undefined ? { value } : {}),
    ...(verified ? { verifiedAt: now } : {}),
    ...(expiresAt ? { expiresAt } : {}),
  }

  const idx = signals.findIndex((s: TrustSignalEntry) => s.signal === signal)
  if (idx >= 0) {
    signals[idx] = entry
  } else {
    signals.push(entry)
  }

  const { error } = await db
    .from(TABLE)
    .update({ signals: JSON.stringify(signals), updated_at: now })
    .eq('id', profile.id)

  if (error) {
    console.error('[updateTrustSignal] error:', error)
    return { success: false, error: 'Failed to update signal' }
  }

  return { success: true }
}

// ============================================
// 3. AWARD BADGE
// ============================================

export async function awardBadge(
  chefId: string,
  badgeName: string,
  tier: TrustTier,
  description: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db = createServerClient()

  let profile = await ensureProfile(db, tenantId, chefId)
  if (!profile) return { success: false, error: 'Failed to load trust profile' }

  const badges = (profile.badges ?? []) as TrustBadge[]
  const now = new Date().toISOString()

  const badge: TrustBadge = {
    id: crypto.randomUUID(),
    name: badgeName,
    icon: badgeNameToIcon(badgeName),
    tier,
    description,
    earnedAt: now,
  }

  // Replace existing badge with same name, or append
  const existingIdx = badges.findIndex((b: TrustBadge) => b.name === badgeName)
  if (existingIdx >= 0) {
    badges[existingIdx] = badge
  } else {
    badges.push(badge)
  }

  const { error } = await db
    .from(TABLE)
    .update({ badges: JSON.stringify(badges), updated_at: now })
    .eq('id', profile.id)

  if (error) {
    console.error('[awardBadge] error:', error)
    return { success: false, error: 'Failed to award badge' }
  }

  return { success: true }
}

// ============================================
// 4. UPDATE TRUST DISPLAY CONFIG
// ============================================

export async function updateTrustDisplayConfig(
  displayConfig: Partial<TrustDisplayConfig>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const chefId = user.entityId
  const db = createServerClient()

  let profile = await ensureProfile(db, tenantId, chefId)
  if (!profile) return { success: false, error: 'Failed to load trust profile' }

  const merged: TrustDisplayConfig = {
    ...DEFAULT_DISPLAY_CONFIG,
    ...((profile.display_config ?? {}) as Partial<TrustDisplayConfig>),
    ...displayConfig,
  }

  const now = new Date().toISOString()
  const { error } = await db
    .from(TABLE)
    .update({ display_config: JSON.stringify(merged), updated_at: now })
    .eq('id', profile.id)

  if (error) {
    console.error('[updateTrustDisplayConfig] error:', error)
    return { success: false, error: 'Failed to update display config' }
  }

  return { success: true }
}

// ============================================
// 5. CALCULATE TRUST SCORE
// ============================================

export async function calculateTrustScore(
  chefId?: string
): Promise<{ success: boolean; score?: number; error?: string }> {
  const user = await requireChef()
  const targetChefId = chefId ?? user.entityId
  const tenantId = user.tenantId!
  const db = createServerClient()

  let profile = await ensureProfile(db, tenantId, targetChefId)
  if (!profile) return { success: false, error: 'Failed to load trust profile' }

  const signals = (profile.signals ?? []) as TrustSignalEntry[]
  let score = 0

  for (const entry of signals) {
    if (entry.verified) {
      // Check expiration
      if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) continue
      score += TRUST_SIGNAL_WEIGHTS[entry.signal] ?? 0
    }
  }

  // Clamp to 0-100
  score = Math.min(100, Math.max(0, score))

  const now = new Date().toISOString()
  const { error } = await db
    .from(TABLE)
    .update({ trust_score: score, updated_at: now })
    .eq('id', profile.id)

  if (error) {
    console.error('[calculateTrustScore] error:', error)
    return { success: false, error: 'Failed to save trust score' }
  }

  return { success: true, score }
}

// ============================================
// 6. GET TRUST LEADERBOARD
// ============================================

export async function getTrustLeaderboard(
  limit: number = 10
): Promise<TrustProfileSummary[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db = createServerClient()

  const { data, error } = await db
    .from(TABLE)
    .select('chef_id, trust_score, badges, signals, updated_at')
    .eq('tenant_id', tenantId)
    .order('trust_score', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getTrustLeaderboard] error:', error)
    return []
  }

  return (data ?? []).map((row: any) => {
    const badges = (row.badges ?? []) as TrustBadge[]
    const signals = (row.signals ?? []) as TrustSignalEntry[]
    const topBadge = badges.length > 0
      ? badges.reduce((best: TrustBadge, b: TrustBadge) =>
          tierRank(b.tier) > tierRank(best.tier) ? b : best
        )
      : undefined

    return {
      chefId: row.chef_id,
      trustScore: row.trust_score ?? 0,
      badgeCount: badges.length,
      topBadge,
      verifiedSignals: signals.filter((s: TrustSignalEntry) => s.verified).length,
      lastUpdated: row.updated_at,
    }
  })
}

// ============================================
// 7. GET EXPIRING CERTIFICATIONS
// ============================================

export async function getExpiringCertifications(
  daysAhead: number = 30
): Promise<Array<{ chefId: string; signal: TrustSignal; expiresAt: string }>> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db = createServerClient()

  const { data, error } = await db
    .from(TABLE)
    .select('chef_id, signals')
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[getExpiringCertifications] error:', error)
    return []
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + daysAhead)
  const results: Array<{ chefId: string; signal: TrustSignal; expiresAt: string }> = []

  for (const row of data ?? []) {
    const signals = (row.signals ?? []) as TrustSignalEntry[]
    for (const entry of signals) {
      if (entry.expiresAt && entry.verified) {
        const expires = new Date(entry.expiresAt)
        if (expires <= cutoff) {
          results.push({
            chefId: row.chef_id,
            signal: entry.signal,
            expiresAt: entry.expiresAt,
          })
        }
      }
    }
  }

  // Sort by soonest expiration
  results.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())
  return results
}

// ============================================
// HELPERS
// ============================================

async function ensureProfile(db: any, tenantId: string, chefId: string): Promise<any | null> {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('chef_id', chefId)
    .maybeSingle()

  if (error) {
    console.error('[ensureProfile] select error:', error)
    return null
  }

  if (data) return data

  // Create new profile
  const { data: created, error: insertError } = await db
    .from(TABLE)
    .insert({
      tenant_id: tenantId,
      chef_id: chefId,
      badges: '[]',
      signals: '[]',
      trust_score: 0,
      display_config: JSON.stringify(DEFAULT_DISPLAY_CONFIG),
    })
    .select('*')
    .single()

  if (insertError) {
    console.error('[ensureProfile] insert error:', insertError)
    return null
  }

  return created
}

function tierRank(tier: TrustTier): number {
  const ranks: Record<TrustTier, number> = {
    bronze: 1,
    silver: 2,
    gold: 3,
    platinum: 4,
  }
  return ranks[tier] ?? 0
}

function badgeNameToIcon(name: string): string {
  const map: Record<string, string> = {
    'Verified Chef': 'shield-check',
    'Food Safety': 'clipboard-check',
    'Top Rated': 'star',
    'Quick Responder': 'zap',
    'Client Favorite': 'heart',
    'Veteran Chef': 'award',
    'Insured': 'shield',
    'Background Verified': 'user-check',
  }
  return map[name] ?? 'badge'
}
