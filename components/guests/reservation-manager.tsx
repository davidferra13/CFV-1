'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  getReservationsForDate,
  cancelReservation,
  seatReservation,
  completeReservation,
  markNoShow,
  confirmReservation,
  getAvailableTables,
} from '@/lib/guests/reservation-actions'
import { ReservationFormModal } from './reservation-form-modal'

interface ReservationGuest {
  id: string
  name: string
  phone: string | null
  email: string | null
  guest_tags?: { tag: string; color: string | null }[]
  guest_comps?: { id: string; redeemed_at: string | null }[]
}

interface Reservation {
  id: string
  guest_id: string
  reservation_date: string
  reservation_time: string | null
  party_size: number | null
  table_number: string | null
  notes: string | null
  status: string
  guests: ReservationGuest | null
}

interface AvailableTable {
  id: string
  table_label: string
  seat_capacity: number
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'border-l-sky-500 bg-sky-950/20',
  seated: 'border-l-emerald-500 bg-emerald-950/20',
  completed: 'border-l-stone-600 bg-stone-900/30',
  no_show: 'border-l-red-500 bg-red-950/20',
  cancelled: 'border-l-stone-700 bg-stone-900/30 opacity-50',
}

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  confirmed: 'info',
  seated: 'success',
  completed: 'default',
  no_show: 'error',
  cancelled: 'error',
}

// Hour slots for timeline view
const HOUR_SLOTS = Array.from({ length: 14 }, (_, i) => {
  const hour = i + 10 // 10 AM to 11 PM
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const display = hour > 12 ? hour - 12 : hour
  return { hour, label: `${display}:00 ${ampm}`, key: `${hour.toString().padStart(2, '0')}:00` }
})

function getReservationHour(time: string | null): number {
  if (!time) return 18 // default 6 PM
  const parts = time.split(':')
  return parseInt(parts[0], 10)
}

export function ReservationManager() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Table picker for seating
  const [seatPickerResId, setSeatPickerResId] = useState<string | null>(null)
  const [availableTables, setAvailableTables] = useState<AvailableTable[]>([])
  const [tablesLoading, setTablesLoading] = useState(false)

  // Confirmation modals
  const [cancelResId, setCancelResId] = useState<string | null>(null)
  const [noShowResId, setNoShowResId] = useState<string | null>(null)

  const loadReservations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getReservationsForDate(selectedDate)
      setReservations(data as Reservation[])
    } catch (err: any) {
      setError(err.message || 'Failed to load reservations')
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    loadReservations()
  }, [loadReservations])

  const handleSeatClick = async (resId: string) => {
    const res = reservations.find((r) => r.id === resId)
    if (!res) return

    setSeatPickerResId(resId)
    setTablesLoading(true)
    try {
      const tables = await getAvailableTables(
        res.reservation_date,
        res.reservation_time || '18:00',
        res.party_size || 1
      )
      setAvailableTables(tables as AvailableTable[])
    } catch {
      setAvailableTables([])
    } finally {
      setTablesLoading(false)
    }
  }

  const handleSeatAtTable = async (tableId: string) => {
    if (!seatPickerResId) return
    setActionLoading(seatPickerResId)
    try {
      await seatReservation(seatPickerResId, tableId)
      setSeatPickerResId(null)
      await loadReservations()
    } catch (err: any) {
      setError(err.message || 'Failed to seat reservation')
    } finally {
      setActionLoading(null)
    }
  }

  const handleComplete = async (resId: string) => {
    setActionLoading(resId)
    try {
      await completeReservation(resId)
      await loadReservations()
    } catch (err: any) {
      setError(err.message || 'Failed to complete reservation')
    } finally {
      setActionLoading(null)
    }
  }

  const handleConfirmCancel = async () => {
    if (!cancelResId) return
    setActionLoading(cancelResId)
    const id = cancelResId
    setCancelResId(null)
    try {
      await cancelReservation(id)
      await loadReservations()
    } catch (err: any) {
      setError(err.message || 'Failed to cancel reservation')
    } finally {
      setActionLoading(null)
    }
  }

  const handleConfirmNoShow = async () => {
    if (!noShowResId) return
    setActionLoading(noShowResId)
    const id = noShowResId
    setNoShowResId(null)
    try {
      await markNoShow(id)
      await loadReservations()
    } catch (err: any) {
      setError(err.message || 'Failed to mark no-show')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSendConfirmation = async (resId: string) => {
    setActionLoading(resId)
    try {
      await confirmReservation(resId)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to send confirmation')
    } finally {
      setActionLoading(null)
    }
  }

  // Group reservations by hour
  const reservationsByHour = new Map<number, Reservation[]>()
  for (const res of reservations) {
    const hour = getReservationHour(res.reservation_time)
    const list = reservationsByHour.get(hour) ?? []
    list.push(res)
    reservationsByHour.set(hour, list)
  }

  const activeCount = reservations.filter(
    (r) => r.status === 'confirmed' || r.status === 'seated'
  ).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-44"
          />
          <Badge variant="default">{activeCount} active</Badge>
          <Badge variant="default">{reservations.length} total</Badge>
        </div>
        <Button variant="primary" onClick={() => setShowCreateForm(true)}>
          New Reservation
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-950 border border-red-800 px-3 py-2 text-sm text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-400">
            Dismiss
          </button>
        </div>
      )}

      {/* Timeline View */}
      {loading ? (
        <div className="text-sm text-stone-500 py-8 text-center">Loading reservations...</div>
      ) : reservations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-500 text-sm">No reservations for this date.</p>
            <Button variant="secondary" className="mt-4" onClick={() => setShowCreateForm(true)}>
              Create first reservation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {HOUR_SLOTS.map((slot) => {
            const slotReservations = reservationsByHour.get(slot.hour) ?? []
            if (slotReservations.length === 0) return null

            return (
              <div key={slot.key} className="flex gap-3">
                <div className="w-20 flex-shrink-0 text-xs text-stone-500 pt-3 text-right">
                  {slot.label}
                </div>
                <div className="flex-1 space-y-1">
                  {slotReservations.map((res) => (
                    <div
                      key={res.id}
                      className={`border-l-4 rounded-r-lg border border-stone-800 px-4 py-3 ${STATUS_COLORS[res.status] || ''}`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-stone-200 truncate">
                            {res.guests?.name || 'Unknown guest'}
                          </span>
                          <Badge
                            variant={STATUS_BADGE[res.status] || 'default'}
                            className="text-xs"
                          >
                            {res.status.replace('_', ' ')}
                          </Badge>
                          {res.guests?.guest_tags?.map((t) => (
                            <span
                              key={t.tag}
                              className="text-xs px-1.5 py-0.5 rounded bg-stone-800 text-stone-400"
                            >
                              {t.tag}
                            </span>
                          ))}
                          {(res.guests?.guest_comps?.filter((c) => !c.redeemed_at)?.length ?? 0) >
                            0 && (
                            <span className="text-xs text-amber-400" title="Has active comps">
                              Comp pending
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-stone-500">
                          {res.reservation_time && <span>{res.reservation_time}</span>}
                          {res.party_size && <span>Party of {res.party_size}</span>}
                          {res.table_number && <span>Table {res.table_number}</span>}
                        </div>
                      </div>

                      {res.notes && <p className="text-xs text-stone-500 mt-1">{res.notes}</p>}

                      {/* Status actions */}
                      <div className="flex items-center gap-2 mt-2">
                        {res.status === 'confirmed' && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleSeatClick(res.id)}
                              loading={actionLoading === res.id}
                            >
                              Seat
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setNoShowResId(res.id)}
                            >
                              No-Show
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400"
                              onClick={() => setCancelResId(res.id)}
                            >
                              Cancel
                            </Button>
                            {res.guests?.email && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSendConfirmation(res.id)}
                                loading={actionLoading === res.id}
                              >
                                Send Confirmation
                              </Button>
                            )}
                          </>
                        )}
                        {res.status === 'seated' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleComplete(res.id)}
                            loading={actionLoading === res.id}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Table picker modal */}
      {seatPickerResId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-stone-900 rounded-xl border border-stone-700 p-6 max-w-md w-full max-h-[70vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-stone-100 mb-4">Select a Table</h3>
            {tablesLoading ? (
              <p className="text-sm text-stone-500">Loading available tables...</p>
            ) : availableTables.length === 0 ? (
              <p className="text-sm text-stone-500">
                No available tables found for this party size.
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
            <Button
              variant="ghost"
              className="mt-4 w-full"
              onClick={() => setSeatPickerResId(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Create reservation modal */}
      {showCreateForm && (
        <ReservationFormModal
          defaultDate={selectedDate}
          onClose={() => setShowCreateForm(false)}
          onCreated={() => {
            setShowCreateForm(false)
            loadReservations()
          }}
        />
      )}

      {/* Cancel confirmation */}
      <ConfirmModal
        open={!!cancelResId}
        title="Cancel this reservation?"
        description="The reservation will be marked as cancelled. The guest will not be automatically notified."
        confirmLabel="Cancel Reservation"
        variant="danger"
        loading={!!actionLoading}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelResId(null)}
      />

      {/* No-show confirmation */}
      <ConfirmModal
        open={!!noShowResId}
        title="Mark as no-show?"
        description="The reservation will be marked as a no-show and the guest will be tagged accordingly."
        confirmLabel="Mark No-Show"
        variant="danger"
        loading={!!actionLoading}
        onConfirm={handleConfirmNoShow}
        onCancel={() => setNoShowResId(null)}
      />
    </div>
  )
}
