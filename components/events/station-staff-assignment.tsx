'use client'

// Station-to-Staff Assignment
// Shows each station as a card with assigned staff.
// Unassigned staff listed at top. Buttons to assign, remove, auto-assign, and clear.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  assignStaffToStation,
  removeStaffFromStation,
  autoAssignStaffToStations,
  clearAllStationAssignments,
  type StationWithStaff,
} from '@/lib/events/station-assignment-actions'

const ROLE_LABELS: Record<string, string> = {
  sous_chef: 'Sous Chef',
  kitchen_assistant: 'Kitchen Asst.',
  service_staff: 'Service',
  server: 'Server',
  bartender: 'Bartender',
  dishwasher: 'Dishwasher',
  other: 'Other',
}

type UnassignedStaffMember = {
  id: string
  name: string
  role: string
}

type Props = {
  eventId: string
  stations: StationWithStaff[]
  unassignedStaff: UnassignedStaffMember[]
}

export function StationStaffAssignment({ eventId, stations, unassignedStaff }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [assigningTo, setAssigningTo] = useState<string | null>(null) // station id being assigned to
  const [selectedStaff, setSelectedStaff] = useState('')

  function handleAssign(stationId: string) {
    if (!selectedStaff) return
    startTransition(async () => {
      try {
        await assignStaffToStation(eventId, stationId, selectedStaff)
        setAssigningTo(null)
        setSelectedStaff('')
        router.refresh()
      } catch (err) {
        console.error('Failed to assign staff:', err)
      }
    })
  }

  function handleRemove(stationId: string, staffMemberId: string) {
    startTransition(async () => {
      try {
        await removeStaffFromStation(eventId, stationId, staffMemberId)
        router.refresh()
      } catch (err) {
        console.error('Failed to remove staff:', err)
      }
    })
  }

  function handleAutoAssign() {
    startTransition(async () => {
      try {
        const result = await autoAssignStaffToStations(eventId)
        if (result.assigned === 0) {
          alert('No unassigned staff to distribute.')
        }
        router.refresh()
      } catch (err) {
        console.error('Failed to auto-assign:', err)
      }
    })
  }

  function handleClearAll() {
    if (!confirm('Remove all station assignments for this event?')) return
    startTransition(async () => {
      try {
        await clearAllStationAssignments(eventId)
        router.refresh()
      } catch (err) {
        console.error('Failed to clear assignments:', err)
      }
    })
  }

  const totalAssigned = stations.reduce((sum, s) => sum + s.staff.length, 0)

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-stone-400">
          {totalAssigned} staff assigned across {stations.filter((s) => s.staff.length > 0).length}{' '}
          stations
        </p>
        <div className="flex gap-2">
          {unassignedStaff.length > 0 && stations.length > 0 && (
            <Button size="sm" variant="secondary" onClick={handleAutoAssign} disabled={isPending}>
              Auto-Assign
            </Button>
          )}
          {totalAssigned > 0 && (
            <Button size="sm" variant="ghost" onClick={handleClearAll} disabled={isPending}>
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Unassigned staff */}
      {unassignedStaff.length > 0 && (
        <Card className="p-4 border-dashed border-stone-700">
          <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
            Unassigned Staff ({unassignedStaff.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {unassignedStaff.map((staff) => (
              <span
                key={staff.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-stone-700 text-stone-300"
              >
                {staff.name}
                <span className="text-stone-500">{ROLE_LABELS[staff.role] || staff.role}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* No stations state */}
      {stations.length === 0 && (
        <div className="text-center py-8 text-stone-500">
          <p className="text-sm">No stations configured.</p>
          <p className="text-xs mt-1">
            Create stations in the Stations page first, then assign staff here.
          </p>
        </div>
      )}

      {/* Station cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stations.map((station) => (
          <Card key={station.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium text-stone-100">{station.name}</h4>
                {station.description && (
                  <p className="text-xs text-stone-500 mt-0.5">{station.description}</p>
                )}
              </div>
              <span className="text-xs text-stone-500">{station.staff.length} staff</span>
            </div>

            {/* Assigned staff list */}
            {station.staff.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {station.staff.map((staff) => (
                  <div
                    key={staff.assignment_id}
                    className="flex items-center justify-between px-2 py-1.5 rounded bg-stone-800/50 group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-stone-200">{staff.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-xs bg-stone-700 text-stone-400">
                        {ROLE_LABELS[staff.role] || staff.role}
                      </span>
                      {staff.role_notes && (
                        <span className="text-xs text-stone-500 italic">{staff.role_notes}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemove(station.id, staff.staff_member_id)}
                      disabled={isPending}
                      className="opacity-0 group-hover:opacity-100 text-stone-500 hover:text-red-400 transition-opacity"
                      title="Remove from station"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Assign button */}
            {assigningTo === station.id ? (
              <div className="flex gap-2">
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="flex-1 px-2 py-1.5 bg-stone-800 border border-stone-700 rounded-md text-sm text-stone-100"
                >
                  <option value="">Select staff...</option>
                  {unassignedStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({ROLE_LABELS[s.role] || s.role})
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={() => handleAssign(station.id)}
                  disabled={isPending || !selectedStaff}
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAssigningTo(null)
                    setSelectedStaff('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setAssigningTo(station.id)}
                disabled={isPending || unassignedStaff.length === 0}
                className="w-full py-1.5 border border-dashed border-stone-700 rounded-md text-xs text-stone-500 hover:text-stone-300 hover:border-stone-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {unassignedStaff.length === 0 ? 'All staff assigned' : '+ Assign Staff'}
              </button>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
