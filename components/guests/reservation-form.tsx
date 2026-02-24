'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createReservation, cancelReservation } from '@/lib/guests/reservation-actions'

interface Reservation {
  id: string
  reservation_date: string
  reservation_time: string | null
  party_size: number | null
  table_number: string | null
  notes: string | null
  status: string
}

interface ReservationFormProps {
  guestId: string
  reservations: Reservation[]
}

export function ReservationForm({ guestId, reservations }: ReservationFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [resDate, setResDate] = useState(new Date().toISOString().slice(0, 10))
  const [resTime, setResTime] = useState('')
  const [partySize, setPartySize] = useState('')
  const [tableNumber, setTableNumber] = useState('')
  const [notes, setNotes] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await createReservation({
        guest_id: guestId,
        reservation_date: resDate,
        reservation_time: resTime || undefined,
        party_size: partySize ? parseInt(partySize) : undefined,
        table_number: tableNumber || undefined,
        notes: notes || undefined,
      })
      setShowForm(false)
      setResTime('')
      setPartySize('')
      setTableNumber('')
      setNotes('')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to create reservation')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (resId: string) => {
    if (!confirm('Cancel this reservation?')) return
    setLoading(true)
    try {
      await cancelReservation(resId)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to cancel reservation')
    } finally {
      setLoading(false)
    }
  }

  const statusVariant = (status: string) => {
    if (status === 'confirmed') return 'success' as const
    if (status === 'cancelled') return 'error' as const
    return 'default' as const
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Reservations</CardTitle>
        <Button variant="secondary" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New Reservation'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-950 border border-red-800 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Create reservation form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="border border-stone-700 rounded-lg p-4 space-y-3"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input
                label="Date"
                type="date"
                value={resDate}
                onChange={(e) => setResDate(e.target.value)}
                required
              />
              <Input
                label="Time"
                type="time"
                value={resTime}
                onChange={(e) => setResTime(e.target.value)}
                placeholder="7:00 PM"
              />
              <Input
                label="Party Size"
                type="number"
                min="1"
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                placeholder="2"
              />
              <Input
                label="Table #"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <Textarea
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special occasion, seating preference..."
              rows={2}
            />
            <Button type="submit" size="sm" loading={loading}>
              Create Reservation
            </Button>
          </form>
        )}

        {/* Reservation list */}
        {reservations.length === 0 ? (
          <p className="text-sm text-stone-500">No reservations yet.</p>
        ) : (
          <div className="space-y-2">
            {reservations.map((res) => (
              <div
                key={res.id}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                  res.status === 'cancelled' ? 'border-stone-800 opacity-60' : 'border-stone-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-200">
                      {res.reservation_date}
                      {res.reservation_time && ` at ${res.reservation_time}`}
                    </span>
                    <Badge variant={statusVariant(res.status)}>{res.status}</Badge>
                  </div>
                  <div className="mt-0.5 flex gap-3 text-xs text-stone-500">
                    {res.party_size && <span>Party of {res.party_size}</span>}
                    {res.table_number && <span>Table {res.table_number}</span>}
                    {res.notes && <span>{res.notes}</span>}
                  </div>
                </div>
                {res.status === 'confirmed' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400"
                    onClick={() => handleCancel(res.id)}
                    loading={loading}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
