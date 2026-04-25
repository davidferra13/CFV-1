import { Metadata } from 'next'
import { getClientPulse } from '@/lib/clients/pulse-actions'
import { PulseView } from './pulse-view'

export const metadata: Metadata = {
  title: 'Pulse | ChefFlow',
}

export default async function PulsePage() {
  const pulse = await getClientPulse()

  const criticalCount = pulse.filter((p) => p.worstUrgency === 'critical').length
  const overdueCount = pulse.filter((p) => p.worstUrgency === 'overdue').length
  const totalItems = pulse.reduce((sum, p) => sum + p.items.length, 0)

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Pulse</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Everyone waiting on you, sorted by how long they've been waiting.
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-100 dark:bg-stone-800">
          <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
            {pulse.length}
          </span>
          <span className="text-sm text-stone-500 dark:text-stone-400">
            {pulse.length === 1 ? 'person' : 'people'} waiting
          </span>
        </div>
        {criticalCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800">
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">
              {criticalCount}
            </span>
            <span className="text-sm text-red-600 dark:text-red-400">critical</span>
          </div>
        )}
        {overdueCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {overdueCount}
            </span>
            <span className="text-sm text-amber-600 dark:text-amber-400">overdue</span>
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-100 dark:bg-stone-800">
          <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
            {totalItems}
          </span>
          <span className="text-sm text-stone-500 dark:text-stone-400">total items</span>
        </div>
      </div>

      {pulse.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-stone-600 dark:text-stone-400 font-medium">Nobody is waiting on you</p>
          <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">
            All caught up. Go cook something amazing.
          </p>
        </div>
      ) : (
        <PulseView clients={pulse} />
      )}
    </div>
  )
}
