'use client'

import { useState, useEffect, useTransition } from 'react'
import { Car, Plus, Trash2 } from '@/components/ui/icons'
import { getEventTravelDetails, type EventTravelDetails } from '@/lib/events/travel-actions'
import {
  getEquipmentRentals,
  createEquipmentRental,
  deleteEquipmentRental,
  getTotalRentalCost,
  type EquipmentRental,
} from '@/lib/events/equipment-rental-actions'

function formatCents(cents: number | null): string {
  if (cents == null) return ''
  return `$${(cents / 100).toFixed(2)}`
}

export function TravelEquipmentSection({ eventId }: { eventId: string }) {
  const [travel, setTravel] = useState<EventTravelDetails | null>(null)
  const [rentals, setRentals] = useState<EquipmentRental[]>([])
  const [totalCost, setTotalCost] = useState({ totalCents: 0, totalDepositCents: 0 })
  const [loading, setLoading] = useState(true)
  const [showRentalForm, setShowRentalForm] = useState(false)
  const [rentalName, setRentalName] = useState('')
  const [rentalItems, setRentalItems] = useState('')
  const [rentalNotes, setRentalNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getEventTravelDetails(eventId),
      getEquipmentRentals(eventId),
      getTotalRentalCost(eventId),
    ])
      .then(([t, r, c]) => {
        if (cancelled) return
        setTravel(t)
        setRentals(r)
        setTotalCost(c)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventId])

  const handleAddRental = () => {
    if (!rentalName.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await createEquipmentRental({
        event_id: eventId,
        vendor_name: rentalName.trim(),
        items: rentalItems
          ? rentalItems
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        notes: rentalNotes.trim() || undefined,
      })
      if (!result.success) {
        setError(result.error || 'Failed to add rental')
        return
      }
      if (result.rental) setRentals((prev) => [...prev, result.rental!])
      const cost = await getTotalRentalCost(eventId)
      setTotalCost(cost)
      setRentalName('')
      setRentalItems('')
      setRentalNotes('')
      setShowRentalForm(false)
    })
  }

  const handleDeleteRental = (rentalId: string) => {
    startTransition(async () => {
      const result = await deleteEquipmentRental(rentalId)
      if (result.success) {
        setRentals((prev) => prev.filter((r) => r.id !== rentalId))
        const cost = await getTotalRentalCost(eventId)
        setTotalCost(cost)
      }
    })
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
        <div className="h-4 w-40 animate-pulse rounded bg-stone-700" />
        <div className="mt-3 space-y-2">
          <div className="h-12 animate-pulse rounded bg-stone-800" />
          <div className="h-12 animate-pulse rounded bg-stone-800" />
        </div>
      </div>
    )
  }

  const hasTravelData = travel && (travel.travel_mode || travel.accommodation_name)

  return (
    <div className="space-y-4">
      {hasTravelData && (
        <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Car size={16} className="text-stone-400" />
            <h3 className="text-sm font-semibold text-white">Travel Details</h3>
          </div>
          <div className="space-y-2 text-xs">
            {travel!.travel_mode && (
              <div className="flex justify-between">
                <span className="text-stone-400">Mode</span>
                <span className="text-white capitalize">{travel!.travel_mode}</span>
              </div>
            )}
            {travel!.travel_departure_at && (
              <div className="flex justify-between">
                <span className="text-stone-400">Departure</span>
                <span className="text-white">
                  {new Date(travel!.travel_departure_at).toLocaleDateString()}
                </span>
              </div>
            )}
            {travel!.travel_return_at && (
              <div className="flex justify-between">
                <span className="text-stone-400">Return</span>
                <span className="text-white">
                  {new Date(travel!.travel_return_at).toLocaleDateString()}
                </span>
              </div>
            )}
            {travel!.travel_cost_cents != null && (
              <div className="flex justify-between">
                <span className="text-stone-400">Travel cost</span>
                <span className="text-white">{formatCents(travel!.travel_cost_cents)}</span>
              </div>
            )}
            {travel!.accommodation_name && (
              <>
                <div className="border-t border-stone-700 pt-2 mt-2" />
                <div className="flex justify-between">
                  <span className="text-stone-400">Accommodation</span>
                  <span className="text-white">{travel!.accommodation_name}</span>
                </div>
              </>
            )}
            {travel!.travel_notes && <p className="text-stone-400 mt-1">{travel!.travel_notes}</p>}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Equipment Rentals</h3>
          <button
            type="button"
            onClick={() => setShowRentalForm(!showRentalForm)}
            className="flex items-center gap-1 rounded bg-stone-700 px-2 py-1 text-xs text-stone-300 hover:bg-stone-600"
          >
            <Plus size={12} />
            Add
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-md bg-red-900/20 border border-red-700/50 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        {showRentalForm && (
          <div className="mb-3 space-y-2 rounded-md border border-stone-700 bg-stone-800 p-3">
            <input
              type="text"
              value={rentalName}
              onChange={(e) => setRentalName(e.target.value)}
              placeholder="Vendor name"
              className="w-full rounded border border-stone-600 bg-stone-700 px-2 py-1.5 text-xs text-white placeholder-stone-400"
            />
            <input
              type="text"
              value={rentalItems}
              onChange={(e) => setRentalItems(e.target.value)}
              placeholder="Items (comma separated)"
              className="w-full rounded border border-stone-600 bg-stone-700 px-2 py-1.5 text-xs text-white placeholder-stone-400"
            />
            <input
              type="text"
              value={rentalNotes}
              onChange={(e) => setRentalNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full rounded border border-stone-600 bg-stone-700 px-2 py-1.5 text-xs text-white placeholder-stone-400"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddRental}
                disabled={isPending || !rentalName.trim()}
                className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {isPending ? 'Adding...' : 'Add Rental'}
              </button>
              <button
                type="button"
                onClick={() => setShowRentalForm(false)}
                className="rounded bg-stone-700 px-3 py-1 text-xs text-stone-300 hover:bg-stone-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {rentals.length === 0 && !showRentalForm && (
          <p className="text-xs text-stone-500">No equipment rentals for this event</p>
        )}

        {rentals.length > 0 && (
          <div className="space-y-2">
            {rentals.map((rental) => (
              <div
                key={rental.id}
                className="flex items-start justify-between rounded-md bg-stone-800/50 px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-white">{rental.vendor_name}</span>
                  {rental.items.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {rental.items.map((item, i) => (
                        <span
                          key={i}
                          className="rounded bg-stone-700 px-1.5 py-0.5 text-xs text-stone-300"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                  {rental.cost_cents != null && (
                    <span className="text-xs text-stone-400 block mt-1">
                      {formatCents(rental.cost_cents)}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  title="Remove rental"
                  onClick={() => handleDeleteRental(rental.id)}
                  disabled={isPending}
                  className="ml-2 shrink-0 rounded p-1 text-stone-500 hover:bg-stone-700 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {totalCost.totalCents > 0 && (
              <div className="flex justify-between border-t border-stone-700 pt-2 text-xs">
                <span className="text-stone-400">Total rental cost</span>
                <span className="font-medium text-white">{formatCents(totalCost.totalCents)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
