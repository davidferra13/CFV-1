// Stuck Events Widget — shows events that haven't progressed past their expected threshold.
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { StuckEvent } from '@/lib/pipeline/stuck-events'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  proposed: 'Proposed',
  accepted: 'Accepted',
  paid: 'Paid',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
}

interface Props {
  events: StuckEvent[]
}

export function StuckEventsWidget({ events }: Props) {
  if (events.length === 0) return null

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
        <h3 className="font-semibold text-stone-100 text-sm">Stuck Events</h3>
        <span className="text-xs text-stone-400 ml-auto">{events.length} flagged</span>
      </div>
      <div className="space-y-2">
        {events.map((e) => {
          const urgency = e.stuckDays >= e.thresholdDays * 2 ? 'text-red-600' : 'text-amber-600'
          return (
            <Link
              key={e.id}
              href={`/events/${e.id}`}
              className="flex items-center justify-between hover:bg-stone-800 rounded-md px-1 py-1 transition-colors group"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-100 truncate">
                  {e.occasion || 'Untitled Event'}
                </p>
                <p className="text-xs text-stone-500">
                  {e.clientName} · {STATUS_LABELS[e.status] ?? e.status}
                </p>
              </div>
              <span className={`text-xs font-semibold shrink-0 ml-3 ${urgency}`}>
                {e.stuckDays}d
              </span>
            </Link>
          )
        })}
      </div>
      <p className="text-xs text-stone-400 mt-3">
        These events haven't moved in longer than expected
      </p>
    </Card>
  )
}
