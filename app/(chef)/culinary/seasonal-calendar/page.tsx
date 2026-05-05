import { requireChef } from '@/lib/auth/get-user'
import { getSeasonalCalendarData } from '@/lib/openclaw/seasonal-calendar-actions'
import { SeasonalCalendarClient } from './seasonal-calendar-client'

export const metadata = { title: 'Seasonal Calendar' }

export default async function SeasonalCalendarPage() {
  await requireChef()
  const data = await getSeasonalCalendarData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Seasonal Calendar</h1>
        <p className="mt-1 max-w-3xl text-stone-400">
          What&apos;s peaking, what&apos;s fading, and what&apos;s coming next. All sourced from
          real price data across {data.totalSeasonal} seasonal ingredients.
        </p>
      </div>
      <SeasonalCalendarClient initialData={data} />
    </div>
  )
}
