// Food Cost Analysis Page
// Theoretical vs actual food cost comparison across recent events.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getEventFinancialSummaryFull } from '@/lib/events/financial-summary-actions'
import { FoodCostVariance } from '@/components/inventory/food-cost-variance'
import { VarianceAlertSettings } from '@/components/inventory/variance-alert-settings'

export const metadata: Metadata = { title: 'Food Cost Analysis - ChefFlow' }

export default async function FoodCostAnalysisPage() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch recent completed events (last 20) to compute variance
  const { data: recentEvents } = await supabase
    .from('events')
    .select('id, occasion, event_date')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['completed', 'in_progress'])
    .order('event_date', { ascending: false })
    .limit(20)

  // Fetch financial summaries for each event in parallel
  const eventIds = (recentEvents || []).map((e: any) => e.id)
  const summaries = await Promise.all(
    eventIds.map((id: string) => getEventFinancialSummaryFull(id).catch(() => null))
  )

  // Build variance data for events that have both projected and actual costs
  const varianceEvents = summaries
    .filter((s): s is NonNullable<typeof s> => {
      if (!s) return false
      const theoretical = s.costs.projectedFoodCostCents
      const actual = s.costs.actualGrocerySpendCents
      // Only include events with meaningful cost data
      return theoretical !== null && theoretical > 0 && actual > 0
    })
    .map((s) => {
      const theoretical = s.costs.projectedFoodCostCents!
      const actual = s.costs.actualGrocerySpendCents
      const varianceCents = actual - theoretical
      const variancePct = theoretical > 0 ? ((actual - theoretical) / theoretical) * 100 : 0

      return {
        eventId: s.event.id,
        eventName: s.event.occasion || `Event ${s.event.eventDate}`,
        theoreticalCostCents: theoretical,
        actualCostCents: actual,
        varianceCents,
        variancePct: Math.round(variancePct * 10) / 10,
      }
    })

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Inventory
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Food Cost Analysis</h1>
        <p className="text-stone-500 mt-1">
          Compare theoretical food costs (from recipes) against actual grocery spend per event.
          Identify where costs are running over or under projections.
        </p>
      </div>

      {varianceEvents.length === 0 ? (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500 text-sm">
            No food cost variance data available yet. This page requires completed events with both
            recipe-based cost projections and actual grocery receipts. Complete a few events with
            recipes and expense tracking to see variance analysis.
          </p>
        </div>
      ) : (
        <FoodCostVariance events={varianceEvents} />
      )}

      {/* Variance alert configuration */}
      <VarianceAlertSettings />
    </div>
  )
}
