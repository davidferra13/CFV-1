// Bulk Assign Events to Partner
// Lets a chef multi-select historical events and tag them to this partner + location.
// No status restriction — intended for retroactive historical attribution.
'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { bulkAssignEventsToPartner } from '@/lib/partners/actions'

type Event = {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number
  status: string
  location_city: string | null
  location_state: string | null
  referral_partner_id: string | null
}

type Location = {
  id: string
  name: string
  city: string | null
  state: string | null
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  proposed: 'Proposed',
  accepted: 'Accepted',
  paid: 'Paid',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
}

export function BulkAssignEvents({
  partnerId,
  locations,
  events,
}: {
  partnerId: string
  locations: Location[]
  events: Event[]
}) {
  const [open, setOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [locationId, setLocationId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isPending, setIsPending] = useState(false)

  const filtered = events.filter((e) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (e.occasion || '').toLowerCase().includes(q) ||
      (e.location_city || '').toLowerCase().includes(q) ||
      e.event_date.includes(q)
    )
  })

  function toggleAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((e) => e.id)))
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  async function handleSubmit() {
    if (!selectedIds.size) return
    setIsPending(true)
    try {
      const res = await bulkAssignEventsToPartner(
        partnerId,
        locationId || null,
        Array.from(selectedIds)
      )
      setResult({
        type: 'success',
        message: `${res.count} event${res.count === 1 ? '' : 's'} assigned successfully.`,
      })
      setSelectedIds(new Set())
      setOpen(false)
    } catch (err) {
      setResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Assignment failed.',
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div>
      {result && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            result.type === 'success' ? 'bg-green-950 text-green-200' : 'bg-red-950 text-red-200'
          }`}
        >
          {result.message}
        </div>
      )}

      {!open ? (
        <Button
          variant="secondary"
          onClick={() => {
            setOpen(true)
            setResult(null)
          }}
        >
          Assign Past Events ({events.length} available)
        </Button>
      ) : (
        <Card className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-stone-100">Assign Events to This Partner</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-stone-400 hover:text-stone-400 text-sm"
            >
              ✕ Close
            </button>
          </div>

          <p className="text-xs text-stone-500">
            Select events you served at this partner&apos;s location. This tags them for reporting —
            it does not change their status or any other data.
          </p>

          {/* Location selector */}
          {locations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Which location? <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">Not specified</option>
                {locations.map((loc) => {
                  const cityState = [loc.city, loc.state].filter(Boolean).join(', ')
                  return (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                      {cityState ? ` — ${cityState}` : ''}
                    </option>
                  )
                })}
              </Select>
            </div>
          )}

          {/* Search */}
          <input
            type="text"
            placeholder="Search by occasion, city, or date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm border border-stone-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          {/* Event list */}
          <div className="max-h-80 overflow-y-auto border border-stone-700 rounded-lg divide-y divide-stone-800">
            {/* Select all row */}
            <div className="flex items-center gap-3 px-3 py-2 bg-stone-800 sticky top-0">
              <input
                type="checkbox"
                checked={filtered.length > 0 && selectedIds.size === filtered.length}
                onChange={toggleAll}
                className="rounded"
              />
              <span className="text-xs font-medium text-stone-400">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
              </span>
            </div>

            {filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-stone-400">
                No events match your search.
              </div>
            )}

            {filtered.map((evt) => (
              <label
                key={evt.id}
                className="flex items-start gap-3 px-3 py-3 hover:bg-stone-800 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(evt.id)}
                  onChange={() => toggleOne(evt.id)}
                  className="mt-0.5 rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-stone-100 truncate">
                      {evt.occasion || 'Untitled Event'}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        evt.status === 'completed'
                          ? 'bg-green-900 text-green-200'
                          : evt.status === 'cancelled'
                            ? 'bg-red-900 text-red-200'
                            : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {STATUS_LABELS[evt.status] || evt.status}
                    </span>
                    {evt.referral_partner_id && (
                      <span className="text-xs text-amber-600 font-medium">Reassigning</span>
                    )}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {format(new Date(evt.event_date), 'MMM d, yyyy')}
                    {evt.location_city &&
                      ` · ${evt.location_city}${evt.location_state ? `, ${evt.location_state}` : ''}`}
                    {` · ${evt.guest_count} guests`}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSubmit}
              disabled={selectedIds.size === 0 || isPending}
              loading={isPending}
            >
              Assign{' '}
              {selectedIds.size > 0
                ? `${selectedIds.size} Event${selectedIds.size === 1 ? '' : 's'}`
                : 'Selected'}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
