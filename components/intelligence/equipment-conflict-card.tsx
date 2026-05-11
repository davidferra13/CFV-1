import Link from 'next/link'
import type { EquipmentConflict } from '@/lib/intelligence/equipment-allocation'

interface EquipmentConflictCardProps {
  conflict: EquipmentConflict
}

export function EquipmentConflictCard({ conflict }: EquipmentConflictCardProps) {
  return (
    <div className="rounded-lg border border-red-800/40 bg-red-950/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
            <h4 className="text-sm font-semibold text-red-300">
              {conflict.equipmentName}
            </h4>
            <span className="text-xs text-stone-500 bg-stone-800/50 px-1.5 py-0.5 rounded">
              {conflict.category}
            </span>
          </div>
          <p className="text-xs text-stone-400 mb-2">
            Needed by {conflict.events.length} events on {conflict.date}
          </p>
        </div>
      </div>

      {/* Events needing this equipment */}
      <div className="space-y-1 mb-3">
        {conflict.events.map((event) => (
          <Link
            key={event.eventId}
            href={`/events/${event.eventId}`}
            className="flex items-center justify-between rounded border border-stone-700/50 bg-stone-900/50 px-3 py-1.5 hover:bg-stone-800/50 transition-colors"
          >
            <span className="text-xs font-medium text-stone-300 truncate">{event.eventName}</span>
            {event.serveTime && (
              <span className="text-xs text-stone-500">{event.serveTime.slice(0, 5)}</span>
            )}
          </Link>
        ))}
      </div>

      {/* Resolution suggestion */}
      <div className="rounded bg-stone-900/50 border border-stone-800/50 px-3 py-2">
        <p className="text-xs text-stone-400">{conflict.resolution}</p>
      </div>
    </div>
  )
}
