import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getPermits, getPermitCostSummary } from '@/lib/food-truck/permit-actions'
import PermitRegistry from '@/components/food-truck/permit-registry'

export const metadata: Metadata = { title: 'Permit Registry - ChefFlow' }

export default async function PermitsPage() {
  const user = await requireChef()

  const [permits, costSummary] = await Promise.all([getPermits(), getPermitCostSummary()])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Permit Registry</h1>
        <p className="text-stone-400 mt-1">
          Track health, business, fire, parking, and vendor permits. Get alerts before they expire.
        </p>
      </div>
      <PermitRegistry initialPermits={permits} initialCostSummary={costSummary} />
    </div>
  )
}
