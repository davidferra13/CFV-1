'use client'

// Mileage Tracker - Full mileage logging UI with quick add, list, and YTD summary.
// IRS 2026 rate: 72.5 cents/mile.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  addMileageLog,
  updateMileageLog,
  deleteMileageLog,
  type MileageEntry,
  type MileageSummary,
} from '@/lib/finance/mileage-actions'
import { MILEAGE_PURPOSE_LABELS, type MileagePurpose } from '@/lib/finance/mileage-constants'
import { Car, Plus, Trash2, Edit2, Save, MapPin, ChevronDown } from '@/components/ui/icons'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'

interface Props {
  initialEntries: MileageEntry[]
  initialSummary: MileageSummary
  events?: { id: string; title: string }[]
}

const PURPOSE_OPTIONS = Object.entries(MILEAGE_PURPOSE_LABELS) as [MileagePurpose, string][]

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function MileageTracker({ initialEntries, initialSummary, events = [] }: Props) {
  const router = useRouter()
  const [entries, setEntries] = useState(initialEntries)
  const [summary, setSummary] = useState(initialSummary)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [tripDate, setTripDate] = useState(
    ((_mt) =>
      `${_mt.getFullYear()}-${String(_mt.getMonth() + 1).padStart(2, '0')}-${String(_mt.getDate()).padStart(2, '0')}`)(
      new Date()
    )
  )
  const [purpose, setPurpose] = useState<MileagePurpose>('client_service')
  const [fromLocation, setFromLocation] = useState('')
  const [toLocation, setToLocation] = useState('')
  const [miles, setMiles] = useState('')
  const [eventId, setEventId] = useState('')
  const [notes, setNotes] = useState('')

  function resetForm() {
    setTripDate(
      ((_mt) =>
        `${_mt.getFullYear()}-${String(_mt.getMonth() + 1).padStart(2, '0')}-${String(_mt.getDate()).padStart(2, '0')}`)(
        new Date()
      )
    )
    setPurpose('client_service')
    setFromLocation('')
    setToLocation('')
    setMiles('')
    setEventId('')
    setNotes('')
    setShowForm(false)
    setEditingId(null)
  }

  function startEdit(entry: MileageEntry) {
    setEditingId(entry.id)
    setTripDate(entry.tripDate)
    setPurpose(entry.purpose)
    setFromLocation(entry.fromLocation || '')
    setToLocation(entry.toLocation || '')
    setMiles(String(entry.miles))
    setEventId(entry.eventId || '')
    setNotes(entry.notes || '')
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const milesNum = parseFloat(miles)
    if (isNaN(milesNum) || milesNum <= 0) return

    const previous = [...entries]
    const previousSummary = { ...summary }

    startTransition(async () => {
      try {
        if (editingId) {
          const result = await updateMileageLog(editingId, {
            tripDate,
            purpose,
            fromLocation: fromLocation || undefined,
            toLocation: toLocation || undefined,
            miles: milesNum,
            eventId: eventId || null,
            notes: notes || undefined,
          })
          if (!result.success) {
            setEntries(previous)
            setSummary(previousSummary)
            return
          }
          // Update local state
          setEntries((prev) =>
            prev.map((entry) =>
              entry.id === editingId
                ? {
                    ...entry,
                    tripDate,
                    purpose,
                    fromLocation: fromLocation || null,
                    toLocation: toLocation || null,
                    miles: milesNum,
                    deductionCents: Math.round(milesNum * 72.5),
                    eventId: eventId || null,
                    notes: notes || null,
                  }
                : entry
            )
          )
        } else {
          const result = await addMileageLog({
            tripDate,
            purpose,
            fromLocation: fromLocation || undefined,
            toLocation: toLocation || undefined,
            miles: milesNum,
            eventId: eventId || null,
            notes: notes || undefined,
          })
          if (!result.success) {
            setEntries(previous)
            setSummary(previousSummary)
            return
          }
          // Optimistic add to local state
          const optimisticEntry: MileageEntry = {
            id: crypto.randomUUID(),
            eventId: eventId || null,
            tripDate,
            purpose,
            fromLocation: fromLocation || null,
            toLocation: toLocation || null,
            miles: milesNum,
            deductionCents: Math.round(milesNum * 72.5),
            description: MILEAGE_PURPOSE_LABELS[purpose] || purpose,
            notes: notes || null,
            createdAt: new Date().toISOString(),
          }
          setEntries((prev) => [optimisticEntry, ...prev])
        }
        resetForm()
        router.refresh()
      } catch {
        setEntries(previous)
        setSummary(previousSummary)
      }
    })
  }

  function handleDelete(id: string) {
    const previous = [...entries]
    setEntries((prev) => prev.filter((e) => e.id !== id))

    startTransition(async () => {
      try {
        const result = await deleteMileageLog(id)
        if (!result.success) {
          setEntries(previous)
        }
      } catch {
        setEntries(previous)
      }
    })
  }

  const totalMiles = entries.reduce((sum, e) => sum + e.miles, 0)
  const totalDeduction = Math.round(totalMiles * 72.5)

  return (
    <div className="space-y-6">
      {/* YTD Summary Card */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-brand-400" />
            <h3 className="text-sm font-semibold text-stone-200">{summary.year} Mileage Summary</h3>
          </div>
          <span className="text-xs text-stone-500">IRS rate: 72.5¢/mi</span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-2xl font-bold text-stone-100">{summary.totalMiles.toFixed(1)}</p>
            <p className="text-xs text-stone-400">Total miles</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-500">
              {formatCents(summary.totalDeductionCents)}
            </p>
            <p className="text-xs text-stone-400">Tax deduction</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-stone-100">{summary.totalTrips}</p>
            <p className="text-xs text-stone-400">Total trips</p>
          </div>
        </div>

        {/* Purpose Breakdown Toggle */}
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-200 transition-colors"
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform ${showBreakdown ? 'rotate-180' : ''}`}
          />
          Breakdown by purpose
        </button>

        {showBreakdown && summary.byPurpose.length > 0 && (
          <div className="mt-3 space-y-2">
            {summary.byPurpose.map((bp) => (
              <div
                key={bp.purpose}
                className="flex items-center justify-between text-sm border-b border-stone-800 pb-1.5 last:border-0"
              >
                <div>
                  <span className="text-stone-200">{bp.label}</span>
                  <span className="text-stone-500 ml-2 text-xs">
                    {bp.tripCount} trip{bp.tripCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-stone-400">{bp.totalMiles.toFixed(1)} mi</span>
                  <span className="text-emerald-500 font-medium">
                    {formatCents(bp.deductionCents)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Add / Edit Form */}
      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-stone-700 bg-stone-900/50 p-4 space-y-3"
        >
          <h4 className="text-sm font-semibold text-stone-200">
            {editingId ? 'Edit Trip' : 'Log New Trip'}
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-400 block mb-1">Date</label>
              <input
                type="date"
                value={tripDate}
                onChange={(e) => setTripDate(e.target.value)}
                required
                className="w-full text-sm border border-stone-700 bg-stone-800 text-stone-100 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">Miles</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={miles}
                onChange={(e) => setMiles(e.target.value)}
                required
                placeholder="0.0"
                className="w-full text-sm border border-stone-700 bg-stone-800 text-stone-100 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-stone-400 block mb-1">Purpose</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as MileagePurpose)}
              className="w-full text-sm border border-stone-700 bg-stone-800 text-stone-100 rounded-lg px-3 py-2"
            >
              {PURPOSE_OPTIONS.map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-400 block mb-1">From</label>
              <AddressAutocomplete
                value={fromLocation}
                onChange={(val) => setFromLocation(val)}
                onPlaceSelect={(data) => setFromLocation(data.formattedAddress)}
                placeholder="Starting location"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">To</label>
              <AddressAutocomplete
                value={toLocation}
                onChange={(val) => setToLocation(val)}
                onPlaceSelect={(data) => setToLocation(data.formattedAddress)}
                placeholder="Destination"
              />
            </div>
          </div>

          {events.length > 0 && (
            <div>
              <label className="text-xs text-stone-400 block mb-1">Link to Event (optional)</label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full text-sm border border-stone-700 bg-stone-800 text-stone-100 rounded-lg px-3 py-2"
              >
                <option value="">No event</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-stone-400 block mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details"
              className="w-full text-sm border border-stone-700 bg-stone-800 text-stone-100 rounded-lg px-3 py-2"
            />
          </div>

          {miles && parseFloat(miles) > 0 && (
            <p className="text-xs text-stone-400">
              Estimated deduction:{' '}
              <span className="text-emerald-500 font-medium">
                {formatCents(Math.round(parseFloat(miles) * 72.5))}
              </span>
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              {isPending ? 'Saving...' : editingId ? 'Update' : 'Add Trip'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-stone-500 hover:text-stone-300 px-3 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-400 font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Log a trip
        </button>
      )}

      {/* Entries List */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-stone-300">Recent Trips ({entries.length})</h4>

        {entries.length === 0 && (
          <p className="text-sm text-stone-500 py-4 text-center">
            No mileage entries yet. Start logging trips to track your tax deduction.
          </p>
        )}

        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start justify-between border border-stone-800 rounded-lg px-4 py-3 hover:border-stone-700 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium text-stone-100">
                  {MILEAGE_PURPOSE_LABELS[entry.purpose] || entry.purpose}
                </span>
                <span className="text-xs px-1.5 py-0.5 bg-stone-800 text-stone-400 rounded">
                  {entry.miles} mi
                </span>
              </div>
              {(entry.fromLocation || entry.toLocation) && (
                <div className="flex items-center gap-1 text-xs text-stone-400 mt-0.5">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {entry.fromLocation}
                    {entry.fromLocation && entry.toLocation ? ' → ' : ''}
                    {entry.toLocation}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1 text-xs text-stone-500">
                <span>{format(new Date(entry.tripDate), 'MMM d, yyyy')}</span>
                {entry.notes && (
                  <>
                    <span>·</span>
                    <span className="truncate">{entry.notes}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span className="text-sm text-emerald-500 font-medium">
                {formatCents(entry.deductionCents)}
              </span>
              <button
                onClick={() => startEdit(entry)}
                className="text-stone-500 hover:text-stone-300 transition-colors p-1"
                title="Edit"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleDelete(entry.id)}
                className="text-stone-500 hover:text-red-500 transition-colors p-1"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer stats */}
      {entries.length > 0 && (
        <div className="flex items-center justify-between text-xs text-stone-500 border-t border-stone-800 pt-3">
          <span>Showing {entries.length} entries</span>
          <span>
            Page total: {totalMiles.toFixed(1)} mi / {formatCents(totalDeduction)} deduction
          </span>
        </div>
      )}
    </div>
  )
}
