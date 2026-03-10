// Staff Availability Widget - shows staff assignments and availability for the week.
// Highlights available (green), partially booked (yellow), fully booked (blue), double-booked (red).

import Link from 'next/link'
import { WidgetCardShell } from './widget-cards/widget-card-shell'
import type { StaffAvailabilityMember } from '@/lib/dashboard/caterer-dashboard-actions'

function getAvailabilityColor(member: StaffAvailabilityMember): {
  dot: string
  label: string
} {
  if (member.isDoubleBooked) return { dot: 'bg-red-400', label: 'Double-booked' }
  if (member.assignmentCount >= 5) return { dot: 'bg-blue-400', label: 'Fully booked' }
  if (member.assignmentCount > 0)
    return { dot: 'bg-amber-400', label: `${member.assignmentCount} events` }
  return { dot: 'bg-green-400', label: 'Available' }
}

export function StaffAvailabilityWidget({ staff }: { staff: StaffAvailabilityMember[] }) {
  if (staff.length === 0) {
    return (
      <WidgetCardShell
        widgetId="staff_availability"
        title="Staff This Week"
        size="sm"
        href="/staff"
      >
        <p className="text-xs text-stone-500 py-2 text-center">No staff members added yet</p>
        <div className="text-center">
          <Link href="/staff" className="text-xs text-brand-500 hover:text-brand-400 font-medium">
            Add staff
          </Link>
        </div>
      </WidgetCardShell>
    )
  }

  // Sort: double-booked first, then by assignment count descending
  const sorted = [...staff].sort((a, b) => {
    if (a.isDoubleBooked !== b.isDoubleBooked) return a.isDoubleBooked ? -1 : 1
    return b.assignmentCount - a.assignmentCount
  })

  const doubleBookedCount = staff.filter((s) => s.isDoubleBooked).length
  const availableCount = staff.filter((s) => s.assignmentCount === 0).length

  return (
    <WidgetCardShell widgetId="staff_availability" title="Staff This Week" size="sm" href="/staff">
      {/* Summary */}
      <div className="flex gap-3 mb-2">
        <span className="text-xs text-stone-500">{staff.length} total</span>
        {availableCount > 0 && (
          <span className="text-xs text-green-400">{availableCount} available</span>
        )}
        {doubleBookedCount > 0 && (
          <span className="text-xs text-red-400">{doubleBookedCount} double-booked</span>
        )}
      </div>

      {/* Staff list */}
      <div className="space-y-1">
        {sorted.slice(0, 6).map((member) => {
          const avail = getAvailabilityColor(member)
          return (
            <div key={member.id} className="flex items-center gap-2 py-1">
              <span className={`w-2 h-2 rounded-full shrink-0 ${avail.dot}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-stone-200 truncate">{member.name}</p>
              </div>
              <span className="text-xs text-stone-500 shrink-0">{member.role ?? 'Staff'}</span>
              <span className="text-xs text-stone-400 shrink-0">{avail.label}</span>
            </div>
          )
        })}
        {sorted.length > 6 && (
          <Link
            href="/staff"
            className="block text-xs text-stone-500 hover:text-stone-300 font-medium mt-1 transition-colors"
          >
            +{sorted.length - 6} more
          </Link>
        )}
      </div>
    </WidgetCardShell>
  )
}
