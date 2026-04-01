// Staff Shift Controls - Check-in / Check-out for a station
// Accepts server-loaded activeShift so state persists across page refreshes.
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { staffShiftCheckIn, staffShiftCheckOut } from '@/lib/staff/staff-portal-actions'
import type { ActiveShift } from '@/lib/staff/staff-portal-actions'

const SHIFT_TYPES = [
  { value: 'open', label: 'Open' },
  { value: 'mid', label: 'Mid' },
  { value: 'close', label: 'Close' },
] as const

type Props = {
  stationId: string
  initialActiveShift: ActiveShift | null
}

export function StaffShiftControls({ stationId, initialActiveShift }: Props) {
  const router = useRouter()
  const [shiftType, setShiftType] = useState<'open' | 'mid' | 'close'>('open')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Use server-provided shift state so a page refresh still shows the active shift
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(initialActiveShift)
  const [checkoutNotes, setCheckoutNotes] = useState('')
  const [showNotesInput, setShowNotesInput] = useState(false)

  async function handleCheckIn() {
    setLoading(true)
    setError(null)

    try {
      const result = await staffShiftCheckIn(stationId, shiftType)
      if (result.activeShift) {
        setActiveShift(result.activeShift)
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckOut() {
    if (!activeShift) return
    setLoading(true)
    setError(null)

    try {
      await staffShiftCheckOut(activeShift.id, checkoutNotes || undefined)
      setActiveShift(null)
      setCheckoutNotes('')
      setShowNotesInput(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-out failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="py-3">
        {activeShift ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-emerald-400">
                Active shift ({activeShift.shift}). Checked in at{' '}
                {new Date(activeShift.check_in_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                .
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowNotesInput(!showNotesInput)}
                  className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
                >
                  {showNotesInput ? 'Hide notes' : 'Add handoff note'}
                </button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCheckOut}
                  loading={loading}
                  disabled={loading}
                >
                  Check Out
                </Button>
              </div>
            </div>
            {showNotesInput && (
              <textarea
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                placeholder="Handoff notes for next shift..."
                rows={2}
                className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-stone-400">Shift Check-in:</span>
            <div className="flex gap-1">
              {SHIFT_TYPES.map((s) => (
                <button
                  key={s.value}
                  type="button"
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
          </div>
        )}
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </CardContent>
    </Card>
  )
}
