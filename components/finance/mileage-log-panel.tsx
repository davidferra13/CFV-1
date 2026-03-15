'use client'

// Mileage Log Panel — per-event or standalone mileage tracker.

import { useState } from 'react'
import { format } from 'date-fns'
import { addMileageEntry, deleteMileageEntry } from '@/lib/finance/mileage-actions'
import type { MileageEntry } from '@/lib/finance/mileage-actions'
import { Trash2, Plus, Car } from '@/components/ui/icons'

interface Props {
  eventId?: string
  initialEntries: MileageEntry[]
}

const IRS_RATE_DISPLAY = '72.5¢/mi' // 2026 IRS rate

export function MileageLogPanel({ eventId, initialEntries }: Props) {
  const [entries, setEntries] = useState(initialEntries)
  const [isAdding, setIsAdding] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const totalMiles = entries.reduce((s, e) => s + e.miles, 0)
  const totalDeduction = entries.reduce((s, e) => s + e.deductionCents, 0)

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)
    if (eventId) fd.set('eventId', eventId)
    await addMileageEntry(fd)
    setSubmitting(false)
    setIsAdding(false)
    window.location.reload()
  }

  async function handleDelete(id: string) {
    await deleteMileageEntry(id, eventId)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Car className="h-4 w-4 text-stone-400 shrink-0" />
        <span className="text-sm text-stone-400">
          {totalMiles.toFixed(1)} miles ·&nbsp;
          <span className="text-emerald-700 font-medium">
            ${(totalDeduction / 100).toFixed(2)} deduction
          </span>
          <span className="text-stone-400 ml-1 text-xs">({IRS_RATE_DISPLAY})</span>
        </span>
      </div>

      {entries.length === 0 && !isAdding && (
        <p className="text-sm text-stone-400 py-3 text-center">No mileage entries yet.</p>
      )}

      <div className="space-y-1.5">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between text-sm border border-stone-800 rounded-md px-3 py-2"
          >
            <div className="min-w-0">
              <p className="font-medium text-stone-100 truncate">{entry.description}</p>
              <p className="text-xs text-stone-400">
                {format(new Date(entry.tripDate), 'MMM d, yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-3">
              <span className="text-xs text-stone-400">{entry.miles} mi</span>
              <span className="text-xs text-emerald-700 font-medium">
                ${(entry.deductionCents / 100).toFixed(2)}
              </span>
              <button
                onClick={() => handleDelete(entry.id)}
                className="text-stone-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isAdding ? (
        <form onSubmit={handleAdd} className="border border-stone-700 rounded-md p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-stone-400">Date</label>
              <input
                name="tripDate"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="w-full text-sm border border-stone-700 rounded px-2 py-1.5 mt-0.5"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400">Miles</label>
              <input
                name="miles"
                type="number"
                step="0.1"
                min="0.1"
                required
                placeholder="0.0"
                className="w-full text-sm border border-stone-700 rounded px-2 py-1.5 mt-0.5"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-stone-400">Description</label>
            <input
              name="description"
              required
              placeholder="e.g. Drive to venue"
              className="w-full text-sm border border-stone-700 rounded px-2 py-1.5 mt-0.5"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="text-xs font-medium px-3 py-1.5 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Adding…' : 'Add Entry'}
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-stone-500 hover:text-stone-300 px-2"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-400 font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Log mileage
        </button>
      )}
    </div>
  )
}
