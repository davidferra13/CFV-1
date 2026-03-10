import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import {
  getYieldHistory,
  getConsistencyScore,
  getYieldByRecipe,
  getWasteReport,
} from '@/lib/bakery/yield-actions'
import YieldTracker from '@/components/bakery/yield-tracker'

export const metadata: Metadata = { title: 'Yield Tracking - ChefFlow' }

export default async function YieldPage() {
  const user = await requireChef()

  const [history, summary, recipeAverages, wasteReport] = await Promise.all([
    getYieldHistory(30),
    getConsistencyScore(),
    getYieldByRecipe(),
    getWasteReport(7),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Yield Tracking</h1>
        <p className="text-stone-400 mt-1">
          Track actual vs expected yield per batch. Measure consistency, identify waste patterns,
          and improve over time.
        </p>
      </div>
      <YieldTracker
        initialHistory={history}
        initialSummary={summary}
        initialRecipeAverages={recipeAverages}
        initialWasteReport={wasteReport}
      />
    </div>
  )
}
