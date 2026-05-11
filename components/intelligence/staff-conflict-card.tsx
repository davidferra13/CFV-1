import Link from 'next/link'
import type { StaffConflict } from '@/lib/intelligence/staff-optimization'

interface StaffConflictCardProps {
  conflict: StaffConflict
}

export function StaffConflictCard({ conflict }: StaffConflictCardProps) {
  const isDoubleBooked = conflict.conflictType === 'double_booked'

  return (
    <div
      className={`rounded-lg border p-4 ${
        isDoubleBooked
          ? 'border-red-800/40 bg-red-950/30'
          : 'border-amber-800/40 bg-amber-950/30'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isDoubleBooked ? 'bg-red-400' : 'bg-amber-400'
              }`}
            />
            <h4
              className={`text-sm font-semibold ${
                isDoubleBooked ? 'text-red-300' : 'text-amber-300'
              }`}
            >
              {isDoubleBooked ? 'Double Booked' : 'Back-to-Back'}
            </h4>
          </div>
          <p
            className={`text-xs mb-2 ${
              isDoubleBooked ? 'text-red-400/80' : 'text-amber-400/80'
            }`}
          >
            {conflict.message}
          </p>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <span className="font-medium text-stone-300">{conflict.staffName}</span>
            <span className="text-stone-600">|</span>
            <span>{conflict.staffRole.replace(/_/g, ' ')}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href={`/events/${conflict.eventA.id}`}
          className="block rounded border border-stone-700/50 bg-stone-900/50 p-2 hover:bg-stone-800/50 transition-colors"
        >
          <p className="text-xs font-medium text-stone-300 truncate">{conflict.eventA.name}</p>
          <p className="text-xs text-stone-500">
            {conflict.eventA.date}
            {conflict.eventA.serveTime ? ` at ${conflict.eventA.serveTime.slice(0, 5)}` : ''}
          </p>
        </Link>
        <Link
          href={`/events/${conflict.eventB.id}`}
          className="block rounded border border-stone-700/50 bg-stone-900/50 p-2 hover:bg-stone-800/50 transition-colors"
        >
          <p className="text-xs font-medium text-stone-300 truncate">{conflict.eventB.name}</p>
          <p className="text-xs text-stone-500">
            {conflict.eventB.date}
            {conflict.eventB.serveTime ? ` at ${conflict.eventB.serveTime.slice(0, 5)}` : ''}
          </p>
        </Link>
      </div>
    </div>
  )
}
