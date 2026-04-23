'use server'

/**
 * OpenClaw Health Actions
 *
 * Server actions for the admin OpenClaw health dashboard.
 * Queries quarantine table, sync audit log, and pricing coverage metrics.
 */

import { requireAdmin } from '@/lib/auth/admin'
import { pgClient } from '@/lib/db'
import { nonBlocking } from '@/lib/monitoring/non-blocking'
import {
  hasOpenClawQuarantineWritebackContext,
  readOpenClawQuarantineReviewContext,
  scaleNormalizedPricePerUnitCents,
  type OpenClawQuarantineReviewAction,
} from '@/lib/openclaw/quarantine-review'
import { refreshIngredientCostsForTenant } from '@/lib/pricing/cost-refresh-actions'
import {
  getPriceIntelligenceGovernor,
  type PriceIntelligenceGovernor,
} from '@/lib/pricing/price-intelligence-governor'
import { revalidatePath } from 'next/cache'

// --- Types ---

export interface QuarantinedPrice {
  id: number
  source: string
  ingredient_name: string | null
  price_cents: number | null
  old_price_cents: number | null
  rejection_reason: string
  quarantined_at: string
  reviewed: boolean
  reviewed_action: OpenClawQuarantineReviewAction | null
  writeback_ready: boolean
}

export interface ReviewQuarantinedPriceInput {
  id: number
  action: OpenClawQuarantineReviewAction
  correctedPriceCents?: number
}

type QuarantinedPriceRow = {
  id: number
  source: string
  ingredient_name: string | null
  price_cents: number | null
  old_price_cents: number | null
  rejection_reason: string
  quarantined_at: string
  reviewed: boolean
  reviewed_action: OpenClawQuarantineReviewAction | null
  raw_data: Record<string, unknown> | null
}

export interface SyncAuditEntry {
  id: number
  sync_type: string
  started_at: string
  completed_at: string | null
  records_processed: number
  records_accepted: number
  records_quarantined: number
  records_skipped: number
  error_message: string | null
}

export interface QuarantineStats {
  total: number
  unreviewed: number
  byReason: { reason: string; count: number }[]
  bySource: { source: string; count: number }[]
}

export interface SyncHealthSummary {
  totalSyncs: number
  lastSyncAt: string | null
  avgAcceptanceRate: number
  avgQuarantineRate: number
  recentErrors: number
}

export interface PricingCoverage {
  totalIngredients: number
  ingredientsWithPrice: number
  ingredientsWithTrend: number
  totalPriceHistory: number
  avgDataPoints: number
  freshLast24h: number
  freshLast7d: number
  governor: PriceIntelligenceGovernor
}

function normalizeReviewInput(
  inputOrId: number | ReviewQuarantinedPriceInput,
  action?: 'approved' | 'rejected'
): ReviewQuarantinedPriceInput {
  if (typeof inputOrId === 'number') {
    return {
      id: inputOrId,
      action: action ?? 'rejected',
    }
  }

  return inputOrId
}

function isValidCorrectionPrice(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

// --- Quarantine Queries ---

export async function getQuarantinedPrices(
  limit = 100,
  showReviewed = false
): Promise<{ data: QuarantinedPrice[]; error: string | null }> {
  await requireAdmin()
  try {
    const rows = await pgClient<QuarantinedPriceRow[]>`
      SELECT id, source, ingredient_name, price_cents, old_price_cents,
             rejection_reason, quarantined_at, reviewed, reviewed_action, raw_data
      FROM openclaw.quarantined_prices
      ${showReviewed ? pgClient`` : pgClient`WHERE NOT reviewed`}
      ORDER BY quarantined_at DESC
      LIMIT ${limit}
    `
    return {
      data: rows.map((row) => {
        const { raw_data, ...rest } = row
        return {
          ...rest,
          reviewed_action: row.reviewed_action ?? null,
          writeback_ready: hasOpenClawQuarantineWritebackContext(raw_data),
        }
      }),
      error: null,
    }
  } catch (err) {
    console.error('[openclaw-health] Failed to fetch quarantined prices:', err)
    return { data: [], error: 'Could not load quarantined prices' }
  }
}

export async function getQuarantineStats(): Promise<{
  data: QuarantineStats | null
  error: string | null
}> {
  await requireAdmin()
  try {
    const [totals] = await pgClient`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE NOT reviewed)::int as unreviewed
      FROM openclaw.quarantined_prices
    `

    const byReason = await pgClient`
      SELECT
        CASE
          WHEN rejection_reason LIKE '%spike%' THEN 'Price spike'
          WHEN rejection_reason LIKE '%crash%' THEN 'Price crash'
          WHEN rejection_reason LIKE '%exceeds%$500%' THEN 'Over $500 cap'
          WHEN rejection_reason LIKE '%exactly 1 cent%' THEN 'Placeholder (1c)'
          WHEN rejection_reason LIKE '%must be > 0%' THEN 'Zero/negative'
          WHEN rejection_reason LIKE '%Null%' THEN 'Null price'
          ELSE 'Other'
        END as reason,
        COUNT(*)::int as count
      FROM openclaw.quarantined_prices
      WHERE NOT reviewed
      GROUP BY 1
      ORDER BY count DESC
    `

    const bySource = await pgClient`
      SELECT source, COUNT(*)::int as count
      FROM openclaw.quarantined_prices
      WHERE NOT reviewed
      GROUP BY source
      ORDER BY count DESC
    `

    return {
      data: {
        total: totals.total,
        unreviewed: totals.unreviewed,
        byReason: byReason as unknown as { reason: string; count: number }[],
        bySource: bySource as unknown as { source: string; count: number }[],
      },
      error: null,
    }
  } catch (err) {
    console.error('[openclaw-health] Failed to fetch quarantine stats:', err)
    return { data: null, error: 'Could not load quarantine statistics' }
  }
}

export async function reviewQuarantinedPrice(
  inputOrId: number | ReviewQuarantinedPriceInput,
  action?: 'approved' | 'rejected'
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin()
  const input = normalizeReviewInput(inputOrId, action)
  const reviewedAt = new Date().toISOString()

  if (input.action === 'corrected' && !isValidCorrectionPrice(input.correctedPriceCents)) {
    return { success: false, error: 'Corrected price must be a positive cent value.' }
  }

  try {
    const rows = await pgClient<QuarantinedPriceRow[]>`
      SELECT id, source, ingredient_name, price_cents, old_price_cents,
             rejection_reason, quarantined_at, reviewed, reviewed_action, raw_data
      FROM openclaw.quarantined_prices
      WHERE id = ${input.id}
      LIMIT 1
    `

    const row = rows[0]
    if (!row) {
      return { success: false, error: 'Quarantined price not found.' }
    }

    if (row.reviewed) {
      return { success: false, error: 'Quarantined price has already been reviewed.' }
    }

    const reviewContext = readOpenClawQuarantineReviewContext(row.raw_data)
    const writebackRequested = input.action === 'approved' || input.action === 'corrected'

    if (writebackRequested && (!reviewContext || !reviewContext.tenantId)) {
      return {
        success: false,
        error:
          'This quarantined row predates review writeback context. Reject it or regenerate it with a fresh sync.',
      }
    }

    const reviewedPriceCents =
      input.action === 'corrected'
        ? input.correctedPriceCents!
        : (reviewContext?.priceCents ?? row.price_cents ?? null)

    if (writebackRequested && (!reviewContext || reviewedPriceCents === null)) {
      return {
        success: false,
        error: 'Quarantined row is missing the authoritative pricing context needed for writeback.',
      }
    }

    const nextRawData = {
      ...(row.raw_data ?? {}),
      review: {
        action: input.action,
        correctedPriceCents: input.action === 'corrected' ? reviewedPriceCents : null,
        originalPriceCents: row.price_cents ?? reviewContext?.priceCents ?? null,
        reviewedAt,
        reviewedBy: admin.email,
        writebackApplied: writebackRequested,
      },
    }

    if (
      writebackRequested &&
      reviewContext &&
      reviewContext.tenantId &&
      reviewedPriceCents !== null
    ) {
      const normalizedPricePerUnitCents = scaleNormalizedPricePerUnitCents({
        originalPriceCents: reviewContext.priceCents,
        originalNormalizedPricePerUnitCents: reviewContext.normalizedPricePerUnitCents,
        reviewedPriceCents,
      })

      const notes =
        input.action === 'corrected'
          ? `Admin corrected quarantined OpenClaw price #${row.id} from ${reviewContext.priceCents} to ${reviewedPriceCents} cents`
          : `Admin approved quarantined OpenClaw price #${row.id}`

      await pgClient.begin(async (txSql: any) => {
        await txSql`
          INSERT INTO ingredient_price_history
            (id, ingredient_id, tenant_id, price_cents, price_per_unit_cents,
             quantity, unit, purchase_date, store_name, source, notes, store_state)
          VALUES (
            gen_random_uuid(), ${reviewContext.ingredientId}, ${reviewContext.tenantId},
            ${reviewedPriceCents}, ${normalizedPricePerUnitCents},
            1, ${reviewContext.normalizedUnit}, ${reviewContext.purchaseDate},
            ${reviewContext.storeName}, ${reviewContext.granularSource},
            ${notes}, ${reviewContext.storeState}
          )
          ON CONFLICT (ingredient_id, tenant_id, source, store_name, purchase_date)
            WHERE source LIKE 'openclaw_%'
          DO UPDATE SET
            price_cents = EXCLUDED.price_cents,
            price_per_unit_cents = EXCLUDED.price_per_unit_cents,
            unit = EXCLUDED.unit,
            notes = EXCLUDED.notes,
            store_state = COALESCE(EXCLUDED.store_state, ingredient_price_history.store_state)
        `

        await txSql`
          UPDATE openclaw.quarantined_prices
          SET reviewed = true,
              reviewed_at = ${reviewedAt},
              reviewed_action = ${input.action},
              raw_data = ${JSON.stringify(nextRawData)}::jsonb
          WHERE id = ${input.id}
        `
      })

      await nonBlocking(
        {
          source: 'openclaw-quarantine-review',
          operation: 'refresh_ingredient_costs',
          severity: 'high',
          entityType: 'ingredient',
          entityId: reviewContext.ingredientId,
          tenantId: reviewContext.tenantId,
          context: {
            quarantineId: row.id,
            reviewAction: input.action,
          },
        },
        async () => {
          await refreshIngredientCostsForTenant(reviewContext.tenantId!, [
            reviewContext.ingredientId,
          ])
        }
      )
    } else {
      await pgClient`
        UPDATE openclaw.quarantined_prices
        SET reviewed = true,
            reviewed_at = ${reviewedAt},
            reviewed_action = ${input.action},
            raw_data = ${JSON.stringify(nextRawData)}::jsonb
        WHERE id = ${input.id}
      `
    }

    revalidatePath('/admin/openclaw/health')
    return { success: true }
  } catch (err) {
    console.error('[openclaw-health] Failed to review quarantined price:', err)
    return { success: false, error: 'Failed to apply the quarantine review action.' }
  }
}

export async function bulkReviewQuarantined(
  action: 'rejected',
  filterSource?: string
): Promise<{ success: boolean; count: number; error?: string }> {
  await requireAdmin()
  try {
    const rows = filterSource
      ? await pgClient`
          UPDATE openclaw.quarantined_prices
          SET reviewed = true, reviewed_at = now(), reviewed_action = ${action}
          WHERE NOT reviewed AND source = ${filterSource}
          RETURNING id
        `
      : await pgClient`
          UPDATE openclaw.quarantined_prices
          SET reviewed = true, reviewed_at = now(), reviewed_action = ${action}
          WHERE NOT reviewed
          RETURNING id
        `
    return { success: true, count: rows.length }
  } catch (err) {
    console.error('[openclaw-health] Failed to bulk review:', err)
    return { success: false, count: 0, error: 'Failed to bulk review' }
  }
}

// --- Sync Health Queries ---

export async function getSyncAuditLog(
  limit = 50
): Promise<{ data: SyncAuditEntry[]; error: string | null }> {
  await requireAdmin()
  try {
    const rows = await pgClient`
      SELECT id, sync_type, started_at, completed_at,
             records_processed, records_accepted, records_quarantined,
             records_skipped, error_message
      FROM openclaw.sync_audit_log
      ORDER BY started_at DESC
      LIMIT ${limit}
    `
    return { data: rows as unknown as SyncAuditEntry[], error: null }
  } catch (err) {
    console.error('[openclaw-health] Failed to fetch sync audit log:', err)
    return { data: [], error: 'Could not load sync history' }
  }
}

export async function getSyncHealthSummary(): Promise<{
  data: SyncHealthSummary | null
  error: string | null
}> {
  await requireAdmin()
  try {
    const [stats] = await pgClient`
      SELECT
        COUNT(*)::int as total_syncs,
        MAX(started_at) as last_sync_at,
        COALESCE(AVG(
          CASE WHEN records_processed > 0
            THEN records_accepted::float / records_processed * 100
            ELSE 100
          END
        ), 0)::numeric(5,1) as avg_acceptance_rate,
        COALESCE(AVG(
          CASE WHEN records_processed > 0
            THEN records_quarantined::float / records_processed * 100
            ELSE 0
          END
        ), 0)::numeric(5,1) as avg_quarantine_rate,
        COUNT(*) FILTER (WHERE error_message IS NOT NULL)::int as recent_errors
      FROM openclaw.sync_audit_log
      WHERE started_at > now() - interval '30 days'
    `

    return {
      data: {
        totalSyncs: stats.total_syncs,
        lastSyncAt: stats.last_sync_at,
        avgAcceptanceRate: Number(stats.avg_acceptance_rate),
        avgQuarantineRate: Number(stats.avg_quarantine_rate),
        recentErrors: stats.recent_errors,
      },
      error: null,
    }
  } catch (err) {
    console.error('[openclaw-health] Failed to fetch sync health:', err)
    return { data: null, error: 'Could not load sync health' }
  }
}

// --- Pricing Coverage ---

export async function getPricingCoverage(): Promise<{
  data: PricingCoverage | null
  error: string | null
}> {
  await requireAdmin()
  try {
    const [legacyRows, governor] = await Promise.all([
      pgClient`
        SELECT
          COUNT(*)::int as total_ingredients,
          COUNT(*) FILTER (
            WHERE last_price_cents IS NOT NULL AND last_price_cents > 0
          )::int as with_price,
          COUNT(*) FILTER (WHERE price_trend_direction IS NOT NULL)::int as with_trend,
          (SELECT COUNT(*)::int FROM ingredient_price_history) as total_history,
          (SELECT COALESCE(AVG(cnt), 0)::int FROM (
            SELECT COUNT(*) as cnt FROM ingredient_price_history GROUP BY ingredient_id
          ) sub) as avg_data_points,
          (SELECT COUNT(*)::int FROM ingredient_price_history
           WHERE purchase_date > now() - interval '24 hours') as fresh_24h,
          (SELECT COUNT(*)::int FROM ingredient_price_history
           WHERE purchase_date > now() - interval '7 days') as fresh_7d
        FROM ingredients
      `,
      getPriceIntelligenceGovernor(8).catch(() => ({
        ready: false,
        summary: {
          expectedSourceSurfaces: 0,
          discoveredSourceSurfaces: 0,
          discoveredStoreSurfaces: 0,
          catalogedStoreSurfaces: 0,
          freshObservedStoreSurfaces: 0,
          inferableStoreSurfaces: 0,
          surfaceableStoreSurfaces: 0,
          expectedCanonicalIngredients: 0,
          discoveredCanonicalIngredients: 0,
          freshObservedCanonicalIngredients: 0,
          inferableCanonicalIngredients: 0,
          surfaceableCanonicalIngredients: 0,
          observedPriceFacts: 0,
          freshObservedPriceFacts: 0,
          inferredPriceFacts: 0,
          surfaceablePriceFacts: 0,
          stalePriceFacts: 0,
          reviewPriceFacts: 0,
          duplicateConflictFacts: 0,
          syncedPriceHistoryRows: 0,
          syncedIngredients: 0,
          consumedRecipeIngredients: 0,
          statesCovered: 0,
          marketsCovered: 0,
          zipsCovered: 0,
          categoriesCovered: 0,
        },
        stateCoverage: [],
        marketCoverage: [],
        zipCoverage: [],
        storeCoverage: [],
        categoryCoverage: [],
      })),
    ])

    const [stats] = legacyRows as unknown as Array<{
      total_ingredients: number
      with_price: number
      with_trend: number
      total_history: number
      avg_data_points: number
      fresh_24h: number
      fresh_7d: number
    }>

    return {
      data: {
        totalIngredients: stats.total_ingredients,
        ingredientsWithPrice: stats.with_price,
        ingredientsWithTrend: stats.with_trend,
        totalPriceHistory: stats.total_history,
        avgDataPoints: stats.avg_data_points,
        freshLast24h: stats.fresh_24h,
        freshLast7d: stats.fresh_7d,
        governor,
      },
      error: null,
    }
  } catch (err) {
    console.error('[openclaw-health] Failed to fetch pricing coverage:', err)
    return { data: null, error: 'Could not load pricing coverage' }
  }
}
