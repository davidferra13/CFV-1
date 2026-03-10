'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  addToWaitlist,
  getWaitlist,
  notifyGuest,
  seatFromWaitlist,
  removeFromWaitlist,
  getWaitlistStats,
  estimateWaitTime,
} from '@/lib/guests/waitlist-actions'
import { getAvailableTables } from '@/lib/guests/reservation-actions'

interface WaitlistEntry {
  id: string
  guest_name: string
  guest_phone: string | null
  party_size: number
  estimated_wait_minutes: number
  status: string
  notes: string | null
  position: number
  created_at: string
  seated_at: string | null
}

interface WaitlistStats {
  queueSize: number
  avgWaitMinutes: number
  longestWaitMinutes: number
  todaySeated: number
}

interface AvailableTable {
  id: string
  table_label: string
  seat_capacity: number
}

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  waiting: 'warning',
  notified: 'info',
  seated: 'success',
  cancelled: 'error',
  no_show: 'error',
}

function formatWaitTime(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return `${hours}h ${remaining}m`
}

export function WaitlistPanel() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [stats, setStats] = useState<WaitlistStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [nextEstimate, setNextEstimate] = useState<number | null>(null)

  // Add form state
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPartySize, setNewPartySize] = useState('2')
  const [newNotes, setNewNotes] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Table picker
  const [seatEntryId, setSeatEntryId] = useState<string | null>(null)
  const [seatPartySize, setSeatPartySize] = useState(1)
  const [availableTables, setAvailableTables] = useState<AvailableTable[]>([])
  const [tablesLoading, setTablesLoading] = useState(false)

  // Remove modal
  const [removeEntryId, setRemoveEntryId] = useState<string | null>(null)
  const [removeReason, setRemoveReason] = useState<'cancelled' | 'no_show'>('cancelled')

  // Auto-refresh timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [, setTick] = useState(0) // force re-render for live timers

  const loadData = useCallback(async () => {
    try {
      const [waitlist, waitlistStats] = await Promise.all([getWaitlist(), getWaitlistStats()])
      setEntries(waitlist as WaitlistEntry[])
      setStats(waitlistStats as WaitlistStats)
    } catch (err: any) {
      setError(err.message || 'Failed to load waitlist')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    // Update live timers every 30 seconds
    timerRef.current = setInterval(() => {
      setTick((t) => t + 1)
    }, 30000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [loadData])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    setAddLoading(true)
    setError(null)
    try {
      await addToWaitlist({
        guestName: newName,
        guestPhone: newPhone || undefined,
        partySize: parseInt(newPartySize, 10) || 2,
        notes: newNotes || undefined,
      })
      setNewName('')
      setNewPhone('')
      setNewPartySize('2')
      setNewNotes('')
      setShowAddForm(false)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to add to waitlist')
    } finally {
      setAddLoading(false)
    }
  }

  const handleNotify = async (entryId: string) => {
    setActionLoading(entryId)
    try {
      await notifyGuest(entryId)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to notify guest')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSeatClick = async (entryId: string, partySize: number) => {
    setSeatEntryId(entryId)
    setSeatPartySize(partySize)
    setTablesLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const now = new Date().toTimeString().slice(0, 5)
      const tables = await getAvailableTables(today, now, partySize)
      setAvailableTables(tables as AvailableTable[])
    } catch {
      setAvailableTables([])
    } finally {
      setTablesLoading(false)
    }
  }

  const handleSeatAtTable = async (tableId: string) => {
    if (!seatEntryId) return
    setActionLoading(seatEntryId)
    try {
      await seatFromWaitlist(seatEntryId, tableId)
      setSeatEntryId(null)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to seat guest')
    } finally {
      setActionLoading(null)
    }
  }

  const handleConfirmRemove = async () => {
    if (!removeEntryId) return
    setActionLoading(removeEntryId)
    const id = removeEntryId
    setRemoveEntryId(null)
    try {
      await removeFromWaitlist(id, removeReason)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to remove from waitlist')
    } finally {
      setActionLoading(null)
    }
  }

  // Estimate wait for next walk-in
  useEffect(() => {
    const ps = parseInt(newPartySize, 10)
    if (!isNaN(ps) && ps >= 1 && showAddForm) {
      estimateWaitTime(ps)
        .then(setNextEstimate)
        .catch(() => setNextEstimate(null))
    }
  }, [newPartySize, showAddForm, entries.length])

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {stats && (
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-stone-500">Queue:</span>
            <span className="font-medium text-stone-200">{stats.queueSize}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-stone-500">Avg wait:</span>
            <span className="font-medium text-stone-200">
              {stats.avgWaitMinutes > 0 ? `${stats.avgWaitMinutes}m` : 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-stone-500">Longest:</span>
            <span className="font-medium text-stone-200">
              {stats.longestWaitMinutes > 0 ? `${stats.longestWaitMinutes}m` : 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-stone-500">Seated today:</span>
            <span className="font-medium text-stone-200">{stats.todaySeated}</span>
          </div>
        </div>
      )}

      {/* Add walk-in button/form */}
      {!showAddForm ? (
        <Button variant="primary" onClick={() => setShowAddForm(true)}>
          Add Walk-In
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Walk-In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Input
                  label="Guest Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  placeholder="Name"
                />
                <Input
                  label="Phone"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Optional"
                />
                <Input
                  label="Party Size"
                  type="number"
                  min="1"
                  value={newPartySize}
                  onChange={(e) => setNewPartySize(e.target.value)}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-stone-400 mb-1">Est. Wait</label>
                  <p className="text-sm text-stone-200 py-2">
                    {nextEstimate !== null ? `~${nextEstimate} min` : '...'}
                  </p>
                </div>
              </div>
              <Input
                label="Notes"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="High chair needed, birthday, etc."
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={addLoading}>
                  Add to Queue
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-lg bg-red-950 border border-red-800 px-3 py-2 text-sm text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-400">
            Dismiss
          </button>
        </div>
      )}

      {/* Queue list */}
      {loading ? (
        <p className="text-sm text-stone-500 py-4 text-center">Loading waitlist...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-stone-500 py-4 text-center">No one on the waitlist.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <div
              key={entry.id}
              className="flex items-center gap-4 border border-stone-800 rounded-lg px-4 py-3"
            >
              {/* Position number */}
              <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-sm font-bold text-stone-300 flex-shrink-0">
                {idx + 1}
              </div>

              {/* Guest info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-stone-200">{entry.guest_name}</span>
                  <Badge variant={STATUS_BADGE[entry.status] || 'default'} className="text-xs">
                    {entry.status}
                  </Badge>
                  <span className="text-xs text-stone-500">Party of {entry.party_size}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-stone-500">
                  <span>Waiting: {formatWaitTime(entry.created_at)}</span>
                  <span>Est: ~{entry.estimated_wait_minutes}m</span>
                  {entry.guest_phone && <span>{entry.guest_phone}</span>}
                  {entry.notes && <span>{entry.notes}</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {entry.status === 'waiting' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleNotify(entry.id)}
                    loading={actionLoading === entry.id}
                  >
                    Notify
                  </Button>
                )}
                {(entry.status === 'waiting' || entry.status === 'notified') && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSeatClick(entry.id, entry.party_size)}
                    loading={actionLoading === entry.id}
                  >
                    Seat
                  </Button>
                )}
                {(entry.status === 'waiting' || entry.status === 'notified') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400"
                    onClick={() => {
                      setRemoveEntryId(entry.id)
                      setRemoveReason('cancelled')
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table picker modal */}
      {seatEntryId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-stone-900 rounded-xl border border-stone-700 p-6 max-w-md w-full max-h-[70vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-stone-100 mb-4">Select a Table</h3>
            {tablesLoading ? (
              <p className="text-sm text-stone-500">Loading available tables...</p>
            ) : availableTables.length === 0 ? (
              <p className="text-sm text-stone-500">
                No available tables for a party of {seatPartySize}.
              </p>
            ) : (
              <div className="space-y-2">
                {availableTables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => handleSeatAtTable(table.id)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-stone-700 hover:bg-stone-800 transition-colors text-left"
                  >
                    <span className="font-medium text-stone-200">{table.table_label}</span>
                    <span className="text-xs text-stone-500">Seats {table.seat_capacity}</span>
                  </button>
                ))}
              </div>
            )}
            <Button variant="ghost" className="mt-4 w-full" onClick={() => setSeatEntryId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Remove confirmation */}
      <ConfirmModal
        open={!!removeEntryId}
        title="Remove from waitlist?"
        description="The guest will be removed from the queue."
        confirmLabel="Remove"
        variant="danger"
        loading={!!actionLoading}
        onConfirm={handleConfirmRemove}
        onCancel={() => setRemoveEntryId(null)}
      />
    </div>
  )
}
