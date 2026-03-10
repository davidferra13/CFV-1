'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { claimSwap, approveSwap, denySwap } from '@/lib/scheduling/shift-actions'

type StaffMember = { id: string; name: string }
type SwapRequest = {
  id: string
  shift_id: string
  requesting_staff_id: string
  covering_staff_id: string | null
  status: string
  reason: string | null
  created_at: string
  scheduled_shifts: {
    id: string
    shift_date: string
    start_time: string
    end_time: string
    role: string | null
  }
  requesting_staff: { id: string; name: string } | null
  covering_staff: { id: string; name: string } | null
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`
}

export function ShiftSwapBoard({
  initialSwaps,
  staffMembers,
  isManager = true,
}: {
  initialSwaps: SwapRequest[]
  staffMembers: StaffMember[]
  isManager?: boolean
}) {
  const [swaps, setSwaps] = useState(initialSwaps)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [selectedCoverer, setSelectedCoverer] = useState<string>('')

  async function handleClaim(swapId: string) {
    if (!selectedCoverer) {
      setError('Select a staff member to cover this shift')
      return
    }
    const previous = [...swaps]
    setSwaps(swaps.map((s) => (s.id === swapId ? { ...s, status: 'claimed' } : s)))
    startTransition(async () => {
      try {
        await claimSwap(swapId, selectedCoverer)
        setClaimingId(null)
        setSelectedCoverer('')
        window.location.reload()
      } catch (err: any) {
        setSwaps(previous)
        setError(err.message ?? 'Failed to claim swap')
      }
    })
  }

  async function handleApprove(swapId: string) {
    const previous = [...swaps]
    setSwaps(swaps.map((s) => (s.id === swapId ? { ...s, status: 'approved' } : s)))
    startTransition(async () => {
      try {
        await approveSwap(swapId)
      } catch (err: any) {
        setSwaps(previous)
        setError(err.message ?? 'Failed to approve swap')
      }
    })
  }

  async function handleDeny(swapId: string) {
    const previous = [...swaps]
    setSwaps(swaps.map((s) => (s.id === swapId ? { ...s, status: 'denied' } : s)))
    startTransition(async () => {
      try {
        await denySwap(swapId)
      } catch (err: any) {
        setSwaps(previous)
        setError(err.message ?? 'Failed to deny swap')
      }
    })
  }

  if (swaps.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-stone-400">No open swap requests right now.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-800 bg-red-950 p-3 text-sm text-red-200">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-200">
            Dismiss
          </button>
        </div>
      )}

      {swaps.map((swap) => {
        const shift = swap.scheduled_shifts
        const shiftDate = new Date(shift.shift_date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })

        return (
          <Card key={swap.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        swap.status === 'open'
                          ? 'bg-amber-900/50 text-amber-300'
                          : swap.status === 'claimed'
                            ? 'bg-blue-900/50 text-blue-300'
                            : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {swap.status}
                    </span>
                    <span className="text-sm font-medium text-stone-200">{shiftDate}</span>
                    <span className="text-sm text-stone-400">
                      {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                    </span>
                    {shift.role && <span className="text-xs text-stone-500">({shift.role})</span>}
                  </div>
                  <div className="mt-1 text-sm text-stone-400">
                    Requested by:{' '}
                    <span className="text-stone-300">
                      {swap.requesting_staff?.name ?? 'Unknown'}
                    </span>
                  </div>
                  {swap.covering_staff && (
                    <div className="text-sm text-stone-400">
                      Covered by: <span className="text-stone-300">{swap.covering_staff.name}</span>
                    </div>
                  )}
                  {swap.reason && (
                    <div className="mt-1 text-xs text-stone-500">Reason: {swap.reason}</div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {swap.status === 'open' && (
                    <>
                      {claimingId === swap.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedCoverer}
                            onChange={(e) => setSelectedCoverer(e.target.value)}
                            className="h-8 rounded border border-stone-700 bg-stone-800 px-2 text-xs text-stone-200"
                          >
                            <option value="">Select staff...</option>
                            {staffMembers
                              .filter((s) => s.id !== swap.requesting_staff_id)
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                          </select>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleClaim(swap.id)}
                            disabled={isPending}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setClaimingId(null)
                              setSelectedCoverer('')
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => setClaimingId(swap.id)}
                          disabled={isPending}
                        >
                          I Can Cover This
                        </Button>
                      )}
                    </>
                  )}

                  {swap.status === 'claimed' && isManager && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleApprove(swap.id)}
                        disabled={isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeny(swap.id)}
                        disabled={isPending}
                      >
                        Deny
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
