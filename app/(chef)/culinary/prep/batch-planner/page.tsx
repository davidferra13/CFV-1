import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  findBatchOpportunities,
  generateUnifiedPrepSchedule,
} from '@/lib/culinary/batch-prep-engine'
import BatchPlannerClient from './batch-planner-client'

export const metadata: Metadata = { title: 'Batch Prep Planner - ChefFlow' }

interface Props {
  searchParams: Promise<{ start?: string; end?: string }>
}

export default async function BatchPrepPlannerPage({ searchParams }: Props) {
  await requireChef()
  const params = await searchParams

  // Default: next 14 days
  const today = new Date()
  const twoWeeksOut = new Date()
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14)

  const start =
    params.start && /^\d{4}-\d{2}-\d{2}$/.test(params.start)
      ? params.start
      : today.toISOString().slice(0, 10)
  const end =
    params.end && /^\d{4}-\d{2}-\d{2}$/.test(params.end)
      ? params.end
      : twoWeeksOut.toISOString().slice(0, 10)

  const [plan, schedule] = await Promise.all([
    findBatchOpportunities(start, end),
    generateUnifiedPrepSchedule(start, end),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/prep" className="text-sm text-stone-500 hover:text-stone-300">
          ← Prep
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Batch Prep Planner</h1>
          {plan.eventsAnalyzed > 0 && (
            <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
              {plan.eventsAnalyzed} events
            </span>
          )}
        </div>
        <p className="text-stone-500 mt-1">
          Cross-event component overlap detection. Find shared prep, batch it, save time.
        </p>
      </div>

      <BatchPlannerClient plan={plan} schedule={schedule} currentStart={start} currentEnd={end} />
    </div>
  )
}
