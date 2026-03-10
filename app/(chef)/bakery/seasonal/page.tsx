import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getSeasonalCalendar } from '@/lib/bakery/seasonal-actions'
import { SeasonalCalendar } from '@/components/bakery/seasonal-calendar'

export const metadata: Metadata = {
  title: 'Seasonal Items | ChefFlow',
}

export default async function SeasonalPage() {
  await requireChef()

  const currentYear = new Date().getFullYear()
  const items = await getSeasonalCalendar(currentYear)

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Seasonal Item Calendar</h1>
        <p className="text-muted-foreground">
          Plan seasonal bakery items with start and end dates, track what is currently in season
        </p>
      </div>

      <SeasonalCalendar initialItems={items} initialYear={currentYear} />
    </div>
  )
}
