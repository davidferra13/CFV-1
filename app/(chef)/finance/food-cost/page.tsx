import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { FoodCostDashboard } from '@/components/finance/food-cost-dashboard'

export const metadata: Metadata = { title: 'Food Cost Tracker - ChefFlow' }

export default async function FoodCostPage() {
  await requireChef()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Food Cost Tracker</h1>
        <p className="text-stone-500 mt-1">
          Track your food cost percentage against your target. The industry benchmark is 28-35%.
        </p>
      </div>
      <FoodCostDashboard />
    </div>
  )
}
