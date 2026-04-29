// Food Cost Analysis Page
// Theoretical vs actual food cost comparison across recent events.

import type { Metadata } from 'next'
import Link from 'next/link'
import { getRecentEventFoodCostTruth } from '@/lib/finance/food-cost-truth-actions'
import { FoodCostVariance } from '@/components/inventory/food-cost-variance'
import { VarianceAlertSettings } from '@/components/inventory/variance-alert-settings'

export const metadata: Metadata = { title: 'Food Cost Analysis' }

export default async function FoodCostAnalysisPage() {
  const foodCostEvents = await getRecentEventFoodCostTruth(20)

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

      {foodCostEvents.length === 0 ? (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500 text-sm">
            No food cost variance data available yet. This page requires completed events with both
            recipe-based cost projections and actual grocery receipts. Complete a few events with
            recipes and expense tracking to see variance analysis.
          </p>
        </div>
      ) : (
        <FoodCostVariance events={foodCostEvents} />
      )}

      {/* Variance alert configuration */}
      <VarianceAlertSettings />
    </div>
  )
}
