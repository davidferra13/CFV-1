import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { ParPlanning } from '@/components/food-truck/par-planning'

export const metadata: Metadata = { title: 'Par Planning - ChefFlow' }

export default async function ParPlanningPage() {
  await requireChef()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pre-Service Par Planning</h1>
        <p className="text-zinc-400 mt-1">
          Calculate how much to prep based on expected covers. Uses your menu board recipes and
          their ingredients to determine quantities needed.
        </p>
      </div>

      <ParPlanning />
    </div>
  )
}
