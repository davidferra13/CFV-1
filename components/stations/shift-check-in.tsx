'use client'

// Shift Check-In - Start of shift for a station
// Shows the last shift handoff summary and allows a staff member to check in.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { shiftCheckIn } from '@/lib/stations/clipboard-actions'

type StaffMember = {
  id: string
  name: string
  role: string
}

type ShiftHandoff = {
  id: string
  shift_type: string
  check_out_at: string | null
  notes: string | null
  staff_member_id: string | null
}

type Props = {
  stationId: string
  staffMembers: StaffMember[]
  lastHandoff: ShiftHandoff | null
}

const SHIFT_TYPES = [
  { value: 'open', label: 'Open' },
  { value: 'mid', label: 'Mid' },
  { value: 'close', label: 'Close' },
]

export function ShiftCheckIn({ stationId, staffMembers, lastHandoff }: Props) {
  const router = useRouter()
  const [staffId, setStaffId] = useState('')
  const [shiftType, setShiftType] = useState('open')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkedIn, setCheckedIn] = useState(false)

  async function handleCheckIn() {
    setLoading(true)
    setError(null)

    try {
      await shiftCheckIn({
        station_id: stationId,
        staff_member_id: staffId || null,
        shift_type: shiftType as 'open' | 'mid' | 'close',
      })
      setCheckedIn(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed')
    } finally {
      setLoading(false)
    }
  }

  if (checkedIn) {
    return (
      <div className="text-sm text-emerald-400">Checked in successfully. Clipboard is ready.</div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Last handoff summary */}
      {lastHandoff && (
        <div className="bg-stone-800/50 rounded-lg p-3 text-sm">
          <div className="text-xs text-stone-500 mb-1">Last Shift Handoff</div>
          <div className="flex flex-wrap gap-3 text-stone-400">
            {lastHandoff.check_out_at && (
              <span>{new Date(lastHandoff.check_out_at).toLocaleString()}</span>
            )}
            <span className="capitalize">{lastHandoff.shift_type} shift</span>
          </div>
          {lastHandoff.notes && <p className="mt-2 text-stone-300 italic">{lastHandoff.notes}</p>}
        </div>
      )}

      {/* Check-in form */}
      <div className="flex flex-wrap items-end gap-3">
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

        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Shift Type</label>
          <select
            value={shiftType}
            onChange={(e) => setShiftType(e.target.value)}
            className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100"
          >
            {SHIFT_TYPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <Button onClick={handleCheckIn} loading={loading} size="sm">
          Check In
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
