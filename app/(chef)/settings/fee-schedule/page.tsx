import type { Metadata } from 'next'
import Link from 'next/link'
import { getFeeSchedule } from '@/lib/events/fee-schedule-actions'
import { FeeScheduleEditor } from '@/components/settings/fee-schedule-editor'

export const metadata: Metadata = { title: 'Fee Schedule' }

export default async function FeeSchedulePage() {
  const { data, error } = await getFeeSchedule()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/settings" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Back to settings
        </Link>
        <h1 className="mt-1 text-3xl font-bold text-stone-100">Fee Schedule</h1>
        <p className="mt-1 text-stone-400">
          Configure cancellation and rescheduling fee tiers based on how far in advance changes are
          made. Each tier defines a day range and the fee applied when changes fall within that
          window.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4 text-sm text-red-400">
          Failed to load fee schedule: {error}
        </div>
      )}

      <FeeScheduleEditor initialTiers={data} />
    </div>
  )
}
