import Link from 'next/link'
import type { SharingOpportunity } from '@/lib/intelligence/staff-optimization'

interface StaffSharingCardProps {
  opportunity: SharingOpportunity
}

export function StaffSharingCard({ opportunity }: StaffSharingCardProps) {
  return (
    <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
        <h4 className="text-sm font-semibold text-emerald-300">
          Sharing Opportunity: {opportunity.date}
        </h4>
      </div>

      <p className="text-xs text-emerald-400/80 mb-3">{opportunity.estimatedSavings}</p>

      {/* Events that can share */}
      <div className="space-y-1 mb-3">
        {opportunity.events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="flex items-center justify-between rounded border border-stone-700/50 bg-stone-900/50 px-3 py-1.5 hover:bg-stone-800/50 transition-colors"
          >
            <span className="text-xs font-medium text-stone-300 truncate">{event.name}</span>
            <div className="flex items-center gap-2 text-xs text-stone-500 shrink-0">
              {event.serveTime && <span>{event.serveTime.slice(0, 5)}</span>}
              {event.location && <span className="truncate max-w-[120px]">{event.location}</span>}
            </div>
          </Link>
        ))}
      </div>

      {/* Suggested staff to share */}
      {opportunity.suggestedSharedStaff.length > 0 && (
        <div className="border-t border-emerald-800/30 pt-2">
          <p className="text-xs text-stone-500 mb-1">Suggested shared staff:</p>
          <div className="space-y-1">
            {opportunity.suggestedSharedStaff.map((staff) => (
              <div
                key={staff.staffMemberId}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-stone-300 font-medium">{staff.staffName}</span>
                <span className="text-stone-500">{staff.splitSchedule}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
