'use client'

// Shift Check-Out - End of shift for a station
// Saves a snapshot of the current clipboard state and handoff notes.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { shiftCheckOut } from '@/lib/stations/clipboard-actions'

type StaffMember = {
  id: string
  name: string
  role: string
}

type Props = {
  stationId: string
  staffMembers: StaffMember[]
}

export function ShiftCheckOut({ stationId, staffMembers }: Props) {
  const router = useRouter()
  const [shiftLogId, setShiftLogId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkedOut, setCheckedOut] = useState(false)

  async function handleCheckOut() {
    if (!shiftLogId) {
      setError('Enter the shift log ID from your check-in')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await shiftCheckOut({
        station_id: stationId,
        shift_log_id: shiftLogId,
        staff_member_id: staffId || null,
        notes: notes || undefined,
      })
      setCheckedOut(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-out failed')
    } finally {
      setLoading(false)
    }
  }

  if (checkedOut) {
    return (
      <div className="text-sm text-emerald-400">
        Checked out successfully. Clipboard snapshot saved.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Shift Log ID</label>
          <input
            type="text"
            value={shiftLogId}
            onChange={(e) => setShiftLogId(e.target.value)}
            placeholder="From check-in"
            className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 w-40 placeholder:text-stone-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Staff Member</label>
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100"
          >
            <option value="">Select staff...</option>
            {staffMembers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Textarea
        label="Handoff Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What the next shift needs to know: prep status, low items, issues..."
        rows={3}
      />

      <div className="flex gap-2 items-center">
        <Button onClick={handleCheckOut} loading={loading} variant="secondary" size="sm">
          Check Out
        </Button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  )
}
