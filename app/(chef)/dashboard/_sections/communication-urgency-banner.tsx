// Communication Urgency Banner
// Shows on dashboard when inquiries are waiting for chef response.
// Links to batch update or individual inquiry. Cannot be scrolled past.

import { getResponseQueue } from '@/lib/inquiries/actions'
import type { ResponseQueueItem } from '@/lib/inquiries/types'
import Link from 'next/link'

export async function CommunicationUrgencyBanner() {
  const queue = await getResponseQueue(20).catch(() => [] as ResponseQueueItem[])

  if (queue.length === 0) return null

  const longestWait = queue[0]?.waitingHours ?? 0
  const isUrgent = longestWait >= 48
  const isWarm = longestWait >= 24

  const borderColor = isUrgent
    ? 'border-red-700/60'
    : isWarm
      ? 'border-amber-700/60'
      : 'border-brand-700/40'

  const bgColor = isUrgent
    ? 'bg-red-950/40'
    : isWarm
      ? 'bg-amber-950/30'
      : 'bg-brand-950/20'

  const dotColor = isUrgent
    ? 'bg-red-500 animate-pulse'
    : isWarm
      ? 'bg-amber-500'
      : 'bg-emerald-500'

  const textColor = isUrgent
    ? 'text-red-300'
    : isWarm
      ? 'text-amber-300'
      : 'text-stone-300'

  // Show top 3 names
  const names = queue.slice(0, 3).map((q) => q.clientName)
  const remaining = queue.length - names.length

  return (
    <Link
      href="/inquiries?status=respond_next"
      className={`block rounded-xl border ${borderColor} ${bgColor} px-5 py-4 transition-all hover:brightness-110`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor}`} />
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${textColor}`}>
              {queue.length} {queue.length === 1 ? 'person is' : 'people are'} waiting for a response
            </p>
            <p className="text-xs text-stone-400 mt-0.5 truncate">
              {names.join(', ')}
              {remaining > 0 ? ` + ${remaining} more` : ''}
              {longestWait > 0 ? ` (longest wait: ${longestWait}h)` : ''}
            </p>
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center justify-center px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors">
          Update Everyone
        </span>
      </div>
    </Link>
  )
}
