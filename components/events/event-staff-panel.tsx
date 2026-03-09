'use client'

// Event Staff Panel
// Shown on the chef event detail page.
// Lets chef assign staff from the roster, view scheduled roster, and record post-event hours.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  assignStaffToEvent,
  removeStaffFromEvent,
  recordStaffHours,
  type AssignStaffInput,
} from '@/lib/staff/actions'

const ROLE_LABELS: Record<string, string> = {
  sous_chef: 'Sous Chef',
  kitchen_assistant: 'Kitchen Assistant',
  service_staff: 'Service Staff',
  server: 'Server',
  bartender: 'Bartender',
  dishwasher: 'Dishwasher',
  other: 'Other',
}

type StaffMember = {
  id: string
  name: string
  role: string
  hourly_rate_cents: number
  phone: string | null
}

type Assignment = {
  id: string
  staff_member_id: string
  role_override: string | null
  scheduled_hours: number | null
  actual_hours: number | null
  pay_amount_cents: number | null
  status: string
  staff_members: StaffMember | null
}

type Props = {
  eventId: string
  roster: StaffMember[] // available staff from chef's roster
  assignments: Assignment[] // current event assignments
}

function formatRate(cents: number) {
  return `$${(cents / 100).toFixed(2)}/hr`
}

export function EventStaffPanel({ eventId, roster, assignments }: Props) {
  const router = useRouter()
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [scheduledHours, setScheduledHours] = useState('')
  const [loading, setLoading] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recordingHoursFor, setRecordingHoursFor] = useState<string | null>(null)
  const [actualHoursInput, setActualHoursInput] = useState('')

  const assignedIds = new Set(assignments.map((a) => a.staff_member_id))
  const availableToAdd = roster.filter((s) => !assignedIds.has(s.id))

  const totalLaborCents = assignments.reduce((sum, a) => sum + (a.pay_amount_cents ?? 0), 0)

  async function handleAssign() {
    if (!selectedStaffId) return
    setLoading(true)
    setError(null)
    try {
      const input: AssignStaffInput = {
        event_id: eventId,
        staff_member_id: selectedStaffId,
        scheduled_hours: scheduledHours ? parseFloat(scheduledHours) : undefined,
      }
      await assignStaffToEvent(input)
      setShowAddForm(false)
      setSelectedStaffId('')
      setScheduledHours('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign staff')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(assignmentId: string) {
    setRemovingId(assignmentId)
    setLoading(true)
    try {
      await removeStaffFromEvent(assignmentId, eventId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove staff')
    } finally {
      setLoading(false)
      setRemovingId(null)
    }
  }

  async function handleRecordHours(assignmentId: string) {
    if (!actualHoursInput) return
    setLoading(true)
    try {
      await recordStaffHours({
        assignment_id: assignmentId,
        actual_hours: parseFloat(actualHoursInput),
      })
      setRecordingHoursFor(null)
      setActualHoursInput('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record hours')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {assignments.length === 0 ? (
        <p className="text-sm text-stone-500">No staff assigned to this event yet.</p>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => {
            const member = a.staff_members
            const role = ROLE_LABELS[a.role_override ?? member?.role ?? 'other'] ?? 'Other'
            return (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-stone-700 bg-stone-900 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-stone-100">{member?.name}</p>
                  <p className="text-xs text-stone-500">
                    {role} · {member ? formatRate(member.hourly_rate_cents) : ''}
                    {a.scheduled_hours ? ` · ${a.scheduled_hours}h scheduled` : ''}
                    {a.actual_hours ? ` · ${a.actual_hours}h worked` : ''}
                    {a.pay_amount_cents ? ` · $${(a.pay_amount_cents / 100).toFixed(2)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {a.status !== 'completed' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRecordingHoursFor(a.id)
                        setActualHoursInput(String(a.scheduled_hours ?? ''))
                      }}
                    >
                      Log hours
                    </Button>
                  )}
                  {a.status === 'scheduled' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(a.id)}
                      disabled={loading}
                    >
                      {removingId === a.id ? 'Removing...' : '×'}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}

          {totalLaborCents > 0 && (
            <p className="text-xs text-stone-500 pt-1">
              Total labor: <strong>${(totalLaborCents / 100).toFixed(2)}</strong>
            </p>
          )}
        </div>
      )}

      {/* Log hours inline */}
      {recordingHoursFor && (
        <div className="rounded-lg border border-amber-200 bg-amber-950 p-3 space-y-2">
          <label className="text-sm font-medium text-amber-800">Actual hours worked</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="0.25"
              value={actualHoursInput}
              onChange={(e) => setActualHoursInput(e.target.value)}
              className="w-24 rounded border border-stone-600 px-2 py-1 text-sm"
              placeholder="6.5"
            />
            <Button
              size="sm"
              onClick={() => handleRecordHours(recordingHoursFor)}
              disabled={loading}
            >
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRecordingHoursFor(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Add staff */}
      {availableToAdd.length > 0 && !showAddForm && (
        <Button size="sm" variant="secondary" onClick={() => setShowAddForm(true)}>
          + Add Staff
        </Button>
      )}

      {showAddForm && (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-3 space-y-2">
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
          >
            <option value="">Select staff member…</option>
            {availableToAdd.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {ROLE_LABELS[s.role] ?? s.role} ({formatRate(s.hourly_rate_cents)})
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            step="0.5"
            value={scheduledHours}
            onChange={(e) => setScheduledHours(e.target.value)}
            placeholder="Scheduled hours (optional)"
            className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAssign} disabled={loading || !selectedStaffId}>
              {loading ? 'Adding…' : 'Add to Event'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
