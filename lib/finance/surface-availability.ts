'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type FinanceSurfaceState = 'active' | 'manual_only' | 'degraded'

export type FinanceSurfaceAvailability = {
  bankFeed: {
    state: FinanceSurfaceState
    showAsPrimary: boolean
    reason: string
  }
  cashFlow: {
    state: FinanceSurfaceState
    showAsPrimary: boolean
    reason: string
  }
}

/**
 * Determine which finance surfaces are honest enough to surface as primary tiles.
 * Read-only, cheap: two count queries.
 */
export async function getFinanceSurfaceAvailability(): Promise<FinanceSurfaceAvailability> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    const [connectionsResult, transactionsResult, cashFlowResult] = await Promise.all([
      // Active bank connections
      db
        .from('bank_connections')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', user.tenantId!)
        .eq('status', 'active'),

      // Any existing bank transactions (manual or synced)
      db
        .from('bank_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', user.tenantId!)
        .limit(1),

      // Test if cash flow query succeeds - just check for events data
      db
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', user.tenantId!)
        .gte(
          'event_date',
          ((_d) =>
            `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`)(
            new Date()
          )
        )
        .limit(1),
    ])

    const hasActiveConnections = (connectionsResult?.count ?? 0) > 0
    const hasTransactions = (transactionsResult?.count ?? 0) > 0
    const cashFlowQueryOk = !cashFlowResult?.error

    // Bank feed availability
    let bankFeedState: FinanceSurfaceState = 'degraded'
    let bankFeedReason = 'No bank connections or transactions on file'
    if (hasActiveConnections) {
      bankFeedState = 'active'
      bankFeedReason = 'Active bank connection present'
    } else if (hasTransactions) {
      bankFeedState = 'manual_only'
      bankFeedReason = 'Manual transactions on file; no automatic sync'
    }

    // Cash flow availability: only promote when underlying data queries work
    const cashFlowState: FinanceSurfaceState = cashFlowQueryOk ? 'active' : 'degraded'
    const cashFlowReason = cashFlowQueryOk
      ? 'Event data available for forecasting'
      : 'Forecast data unavailable'

    return {
      bankFeed: {
        state: bankFeedState,
        showAsPrimary: bankFeedState !== 'degraded',
        reason: bankFeedReason,
      },
      cashFlow: {
        state: cashFlowState,
        showAsPrimary: cashFlowState === 'active',
        reason: cashFlowReason,
      },
    }
  } catch {
    // On any error, default to not promoting these surfaces
    return {
      bankFeed: { state: 'degraded', showAsPrimary: false, reason: 'Availability check failed' },
      cashFlow: { state: 'degraded', showAsPrimary: false, reason: 'Availability check failed' },
    }
  }
}
