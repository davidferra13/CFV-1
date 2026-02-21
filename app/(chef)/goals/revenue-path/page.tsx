import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireChef } from '@/lib/auth/get-user'
import { getActiveGoals } from '@/lib/goals/actions'
import { getServiceTypes, getRevenuePath } from '@/lib/goals/service-mix-actions'
import { isRevenueGoal } from '@/lib/goals/engine'
import { RevenuePathPanel } from '@/components/goals/revenue-path-panel'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Revenue Path — ChefFlow' }

export default async function RevenuePathPage() {
  await requireChef()

  const [allGoals, serviceTypes] = await Promise.all([getActiveGoals(), getServiceTypes()])

  const revenueGoal = allGoals.find((g) => isRevenueGoal(g.goalType)) ?? null

  const pathData = revenueGoal ? await getRevenuePath(revenueGoal.id) : null

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href="/goals"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Goals
        </Link>
        <h1 className="text-3xl font-bold text-stone-900">Revenue Path</h1>
        <p className="text-stone-500 mt-1">
          Build a concrete mix of services to hit your monthly revenue goal — no mystery, just math.
        </p>
      </div>

      {!revenueGoal ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-stone-500">You don&apos;t have an active revenue goal yet.</p>
            <p className="text-sm text-stone-400">
              Set a monthly or annual revenue goal and this calculator will show you exactly what to
              do.
            </p>
            <Link href="/goals/setup">
              <Button variant="primary">Set a Revenue Goal</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <RevenuePathPanel
          revenueGoal={revenueGoal}
          initialServiceTypes={serviceTypes}
          alreadyBookedCents={pathData?.alreadyBookedCents ?? 0}
          alreadyBookedCount={pathData?.alreadyBookedCount ?? 0}
          gapCents={pathData?.gapCents ?? revenueGoal.targetValue}
          targetMonth={pathData?.targetMonth ?? revenueGoal.periodStart.slice(0, 7)}
        />
      )}
    </div>
  )
}
