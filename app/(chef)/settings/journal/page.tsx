import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getChefJourneyInsights, getChefJourneys } from '@/lib/journey/actions'
import { JourneyHub } from '@/components/journey/journey-hub'

export default async function JournalPage() {
  await requireChef()

  const [journeys, insights] = await Promise.all([
    getChefJourneys({ status: 'all', limit: 200 }),
    getChefJourneyInsights(),
  ])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm">
          <Link href="/settings" className="text-brand-600 hover:text-brand-400">
            Settings
          </Link>
          <span className="text-stone-400">/</span>
          <span className="text-stone-500">Chef Journal</span>
        </div>
        <h1 className="text-3xl font-bold text-stone-100 mt-2">Chef Journal</h1>
        <p className="text-stone-400 mt-1">
          Build a living record of where your chefs go, what inspires them, and how those learnings
          become better food.
        </p>
      </div>

      <JourneyHub journeys={journeys} insights={insights} />
    </div>
  )
}
