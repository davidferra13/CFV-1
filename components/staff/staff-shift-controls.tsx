// Staff Shift Controls - Check-in / Check-out for a station
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { staffShiftCheckIn, staffShiftCheckOut } from '@/lib/staff/staff-portal-actions'

const SHIFT_TYPES = [
  { value: 'open', label: 'Open' },
  { value: 'mid', label: 'Mid' },
  { value: 'close', label: 'Close' },
] as const

type Props = {
  stationId: string
}

export function StaffShiftControls({ stationId }: Props) {
  const router = useRouter()
  const [shiftType, setShiftType] = useState<'open' | 'mid' | 'close'>('open')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkedIn, setCheckedIn] = useState(false)

  async function handleCheckIn() {
    setLoading(true)
    setError(null)

    try {
      await staffShiftCheckIn(stationId, shiftType)
      setCheckedIn(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="py-3">
        {checkedIn ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-emerald-400">
              Checked in for {shiftType} shift. Clipboard is ready.
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-stone-400">Shift Check-in:</span>
            <div className="flex gap-1">
              {SHIFT_TYPES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setShiftType(s.value)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    shiftType === s.value
                      ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                      : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-500'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <Button onClick={handleCheckIn} loading={loading} size="sm">
              Check In
            </Button>
            {error && <span className="text-sm text-red-400">{error}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
