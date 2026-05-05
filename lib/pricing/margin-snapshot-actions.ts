'use server'

// Margin Snapshot Actions
// Persist and query margin snapshots for trend tracking.
// Snapshots are deduplicated: one per event per day per source.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { EventPricingIntelligencePayload } from '@/lib/finance/event-pricing-intelligence-actions'

// ── Types ────────────────────────────────────────────────────────────────

export type MarginSnapshotSource = 'page_view' | 'cost_refresh' | 'cron' | 'manual'

export type MarginSnapshot = {
  id: string
  eventId: string | null
  menuId: string | null
  snapshotDate: string
  foodCostPercent: number | null
  marginPercent: number | null
  profitCents: number | null
  pricingConfidence: string | null
  warningCount: number
  spikeCount: number
  source: MarginSnapshotSource
  createdAt: string
}

export type MarginTrend = {
  snapshots: MarginSnapshot[]
  trend: {
    foodCostDirection: 'improving' | 'worsening' | 'stable' | 'insufficient_data'
    marginDirection: 'improving' | 'worsening' | 'stable' | 'insufficient_data'
    foodCostDeltaPct: number | null
    marginDeltaPct: number | null
  }
}

// ── Write ────────────────────────────────────────────────────────────────

/**
 * Persist a margin snapshot from pricing intelligence data.
 * Deduplicates: one snapshot per event per day per source.
 */
export async function saveMarginSnapshot(
  data: EventPricingIntelligencePayload,
  source: MarginSnapshotSource = 'page_view'
): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const menuId = data.menu?.menuIds?.[0] ?? null

  await db.from('margin_snapshots').upsert(
    {
      tenant_id: tenantId,
      event_id: data.eventId,
      menu_id: menuId,
      snapshot_date: new Date().toISOString().slice(0, 10),
      quoted_price_cents: data.projected.quoteTotalCents || null,
      revenue_cents: data.actual.revenueCents || null,
      projected_food_cost_cents: data.projected.foodCostCents || null,
      actual_food_cost_cents: data.actual.foodCostCents || null,
      projected_total_cost_cents: data.projected.totalCostCents || null,
      actual_total_cost_cents: data.actual.totalCostCents || null,
      food_cost_percent:
        data.projected.projectedFoodCostPercent ?? data.actual.actualFoodCostPercent ?? null,
      margin_percent:
        data.actual.actualMarginPercent ?? data.projected.expectedMarginPercent ?? null,
      profit_cents:
        data.actual.revenueCents > 0
          ? data.actual.actualProfitCents
          : data.projected.expectedProfitCents || null,
      target_food_cost_percent: data.projected.targetFoodCostPercent,
      target_margin_percent: data.projected.targetMarginPercent,
      pricing_confidence: data.confidence.pricingConfidence,
      ingredient_count: data.confidence.totalIngredientCount,
      missing_price_count: data.confidence.missingPriceCount,
      stale_price_count: data.confidence.stalePriceCount,
      spike_count: data.priceSignals.ingredientSpikeCount,
      warning_count: data.warnings.length,
      source,
    },
    {
      onConflict: 'tenant_id,event_id,snapshot_date,source',
      ignoreDuplicates: false,
    }
  )
}

// ── Read ─────────────────────────────────────────────────────────────────

/**
 * Get margin trend for a specific event over time.
 */
export async function getEventMarginTrend(
  eventId: string,
  days: number = 90
): Promise<MarginTrend> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const { data: rows } = await db
    .from('margin_snapshots')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .gte('snapshot_date', cutoff.toISOString().slice(0, 10))
    .order('snapshot_date', { ascending: true })
    .limit(100)

  const snapshots = ((rows ?? []) as any[]).map(mapRow)
  return { snapshots, trend: computeTrend(snapshots) }
}

/**
 * Get tenant-wide margin trend (all events).
 */
export async function getTenantMarginTrend(days: number = 90): Promise<MarginTrend> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const { data: rows } = await db
    .from('margin_snapshots')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('snapshot_date', cutoff.toISOString().slice(0, 10))
    .order('snapshot_date', { ascending: true })
    .limit(500)

  const snapshots = ((rows ?? []) as any[]).map(mapRow)
  return { snapshots, trend: computeTrend(snapshots) }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function mapRow(row: any): MarginSnapshot {
  return {
    id: row.id,
    eventId: row.event_id ?? null,
    menuId: row.menu_id ?? null,
    snapshotDate: row.snapshot_date,
    foodCostPercent: row.food_cost_percent != null ? Number(row.food_cost_percent) : null,
    marginPercent: row.margin_percent != null ? Number(row.margin_percent) : null,
    profitCents: row.profit_cents ?? null,
    pricingConfidence: row.pricing_confidence ?? null,
    warningCount: row.warning_count ?? 0,
    spikeCount: row.spike_count ?? 0,
    source: row.source ?? 'page_view',
    createdAt: row.created_at,
  }
}

function computeTrend(snapshots: MarginSnapshot[]): MarginTrend['trend'] {
  if (snapshots.length < 2) {
    return {
      foodCostDirection: 'insufficient_data',
      marginDirection: 'insufficient_data',
      foodCostDeltaPct: null,
      marginDeltaPct: null,
    }
  }

  // Compare first third vs last third for smoothed trend
  const third = Math.max(1, Math.floor(snapshots.length / 3))
  const early = snapshots.slice(0, third)
  const recent = snapshots.slice(-third)

  const avgFoodEarly = avgOf(early, 'foodCostPercent')
  const avgFoodRecent = avgOf(recent, 'foodCostPercent')
  const avgMarginEarly = avgOf(early, 'marginPercent')
  const avgMarginRecent = avgOf(recent, 'marginPercent')

  const foodDelta =
    avgFoodEarly != null && avgFoodRecent != null
      ? Math.round((avgFoodRecent - avgFoodEarly) * 10) / 10
      : null
  const marginDelta =
    avgMarginEarly != null && avgMarginRecent != null
      ? Math.round((avgMarginRecent - avgMarginEarly) * 10) / 10
      : null

  return {
    foodCostDirection:
      foodDelta == null
        ? 'insufficient_data'
        : foodDelta < -1
          ? 'improving'
          : foodDelta > 1
            ? 'worsening'
            : 'stable',
    marginDirection:
      marginDelta == null
        ? 'insufficient_data'
        : marginDelta > 1
          ? 'improving'
          : marginDelta < -1
            ? 'worsening'
            : 'stable',
    foodCostDeltaPct: foodDelta,
    marginDeltaPct: marginDelta,
  }
}

function avgOf(
  snapshots: MarginSnapshot[],
  key: 'foodCostPercent' | 'marginPercent'
): number | null {
  const values = snapshots.map((s) => s[key]).filter((v): v is number => v != null)
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}
