'use client'

// Grocery Trip History
// Lists past grocery trips with date, store, total, client count.
// Date range filter, click to view/edit splits.

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getGroceryTrips, deleteGroceryTrip } from '@/lib/grocery/grocery-splitting-actions'

type GroceryTrip = {
  id: string
  store_name: string | null
  trip_date: string
  total_cents: number
  notes: string | null
  grocery_trip_splits?: { client_id: string }[]
}

type Props = {
  initialTrips?: GroceryTrip[]
  onSelectTrip?: (tripId: string) => void
}

export function GroceryTripHistory({ initialTrips = [], onSelectTrip }: Props) {
  const [isPending, startTransition] = useTransition()
  const [trips, setTrips] = useState<GroceryTrip[]>(initialTrips)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleFilter() {
    setError(null)
    startTransition(async () => {
      try {
        const dateRange = fromDate || toDate
          ? { from: fromDate, to: toDate }
          : undefined
        const result = await getGroceryTrips(dateRange)
        setTrips(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trips')
      }
    })
  }

  function handleDelete(tripId: string) {
    const previousTrips = [...trips]
    setTrips((prev) => prev.filter((t) => t.id !== tripId))
    setError(null)

    startTransition(async () => {
      try {
        await deleteGroceryTrip(tripId)
      } catch (err) {
        setTrips(previousTrips)
        setError(err instanceof Error ? err.message : 'Failed to delete trip')
      }
    })
  }

  function getUniqueClientCount(trip: GroceryTrip): number {
    const ids = new Set(trip.grocery_trip_splits?.map((s) => s.client_id) ?? [])
    return ids.size
  }

  // Load trips on mount if none provided
  useEffect(() => {
    if (initialTrips.length === 0) {
      handleFilter()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
      )}

      {/* Date range filter */}
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <Button variant="secondary" onClick={handleFilter} disabled={isPending}>
          {isPending ? 'Loading...' : 'Filter'}
        </Button>
      </div>

      {/* Trip list */}
      {trips.length === 0 && !isPending && (
        <p className="text-sm text-gray-500 py-4">No grocery trips found.</p>
      )}

      <div className="space-y-2">
        {trips.map((trip) => {
          const clientCount = getUniqueClientCount(trip)
          return (
            <div
              key={trip.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between"
              onClick={() => onSelectTrip?.(trip.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">
                    {trip.store_name || 'Grocery Trip'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(trip.trip_date + 'T00:00:00').toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm font-semibold text-gray-900">
                    ${(trip.total_cents / 100).toFixed(2)}
                  </span>
                  {clientCount > 0 && (
                    <span className="text-xs text-gray-500">
                      {clientCount} client{clientCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {trip.notes && (
                    <span className="text-xs text-gray-400 truncate max-w-[200px]">
                      {trip.notes}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(trip.id)
                  }}
                  disabled={isPending}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Delete
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
