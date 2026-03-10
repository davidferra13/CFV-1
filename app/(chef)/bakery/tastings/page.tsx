import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getUpcomingTastings, getTastingConversionStats } from '@/lib/bakery/tasting-actions'
import { TastingScheduler } from '@/components/bakery/tasting-scheduler'

export const metadata: Metadata = {
  title: 'Tasting Appointments | ChefFlow',
}

export default async function TastingsPage() {
  await requireChef()

  const [tastings, stats] = await Promise.all([
    getUpcomingTastings(30),
    getTastingConversionStats(30),
  ])

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tasting Appointments</h1>
        <p className="text-muted-foreground">
          Schedule tastings, track outcomes, and measure conversion rates
        </p>
      </div>

      <TastingScheduler initialTastings={tastings} initialStats={stats} />
    </div>
  )
}
