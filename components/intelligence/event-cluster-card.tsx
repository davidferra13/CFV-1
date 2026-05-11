import Link from 'next/link'
import type { EventCluster } from '@/lib/intelligence/travel-optimization'

interface EventClusterCardProps {
  cluster: EventCluster
}

export function EventClusterCard({ cluster }: EventClusterCardProps) {
  const isMultiEvent = cluster.eventCount > 1

  return (
    <div
      className={`rounded-lg border p-4 ${
        isMultiEvent
          ? 'border-blue-800/40 bg-blue-950/20'
          : 'border-stone-800 bg-stone-900/30'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h4
            className={`text-sm font-semibold ${
              isMultiEvent ? 'text-blue-300' : 'text-stone-300'
            }`}
          >
            {cluster.area}
          </h4>
          {isMultiEvent && (
            <span className="inline-flex items-center rounded-full bg-blue-900/50 px-2 py-0.5 text-xs font-medium text-blue-300">
              {cluster.eventCount} events
            </span>
          )}
        </div>
        <span className="text-xs text-stone-500">{cluster.dateSpan}</span>
      </div>

      <div className="space-y-1.5">
        {cluster.events.map((event) => (
          <Link
            key={event.eventId}
            href={`/events/${event.eventId}`}
            className="flex items-center justify-between rounded border border-stone-700/50 bg-stone-900/50 px-3 py-2 hover:bg-stone-800/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-stone-300 truncate">{event.eventName}</p>
              <p className="text-xs text-stone-500 truncate">
                {event.clientName} &middot; {event.guestCount} guests
              </p>
            </div>
            <div className="text-right shrink-0 ml-2">
              <p className="text-xs text-stone-400">{event.eventDate}</p>
              {event.location && (
                <p className="text-xs text-stone-600 truncate max-w-[150px]">{event.location}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
