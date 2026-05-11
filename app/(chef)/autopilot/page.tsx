// Autopilot Page
// Chef-only surface. Shows clients who need a status update.
// Remy drafts, chef approves, system sends.

import type { Metadata } from 'next'
import { detectPendingClientUpdates } from '@/lib/autopilot/detection'
import { AutopilotCard } from '@/components/autopilot/autopilot-card'
import { Zap, CheckCircle } from '@/components/ui/icons'

export const metadata: Metadata = {
  title: 'Autopilot',
}

// Revalidate every 5 minutes so the list stays reasonably fresh
export const revalidate = 300

export default async function AutopilotPage() {
  const pending = await detectPendingClientUpdates()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Zap className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-stone-100">Autopilot</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            {pending.length === 0
              ? 'All clients are up to date.'
              : `${pending.length} ${pending.length === 1 ? 'client needs' : 'clients need'} a status update`}
          </p>
        </div>
      </div>

      {/* How it works - shown when there are items */}
      {pending.length > 0 && (
        <div className="rounded-xl border border-stone-800 bg-stone-900/40 px-4 py-3 flex items-start gap-3">
          <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-stone-400 leading-relaxed">
            Remy drafted each message using event, quote, and timeline data. Review, edit if needed,
            then approve to send directly to the client.
          </p>
        </div>
      )}

      {/* Empty state */}
      {pending.length === 0 && (
        <div className="rounded-xl border border-stone-800 bg-stone-900/40 px-6 py-12 text-center">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <p className="text-stone-300 font-medium">All caught up</p>
          <p className="text-stone-500 text-sm mt-1">
            No active events have been silent for 7 or more days.
          </p>
        </div>
      )}

      {/* Cards */}
      {pending.length > 0 && (
        <div className="space-y-4">
          {pending.map((item) => (
            <AutopilotCard key={item.eventId} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
