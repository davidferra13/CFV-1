import { requireChef } from '@/lib/auth/get-user'
import { getCurrentMomentum } from '@/lib/professional/momentum-actions'
import { MomentumDashboard } from '@/components/professional/momentum-dashboard'

export default async function MomentumPage() {
  const chef = await requireChef()
  const snapshot = await getCurrentMomentum()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Professional Momentum</h1>
        <p className="text-sm text-stone-500 mt-1">
          Track your growth across new dishes, cuisines, education, and creative projects.
        </p>
      </div>
      <MomentumDashboard snapshot={snapshot} />
    </div>
  )
}
