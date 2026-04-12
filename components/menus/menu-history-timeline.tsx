'use client'

import { useState, useTransition } from 'react'
import {
  getClientMenuHistory,
  addMenuHistoryEntry,
  updateMenuFeedback,
} from '@/lib/menus/menu-history-actions'
import { todayLocalDateString } from '@/lib/utils/format'

// -- Types --

type DishEntry = {
  name: string
  category?: string
  liked?: boolean
  disliked?: boolean
  notes?: string
}

type HistoryEntry = {
  id: string
  chef_id: string
  client_id: string
  event_id: string | null
  menu_id: string | null
  served_date: string
  dishes_served: DishEntry[]
  overall_rating: number | null
  client_feedback: string | null
  chef_notes: string | null
  guest_count: number | null
  created_at: string
}

type Props = {
  clientId: string
  initialEntries?: HistoryEntry[]
}

// -- Component --

export default function MenuHistoryTimeline({ clientId, initialEntries = [] }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>(initialEntries)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Load entries
  function loadEntries() {
    startTransition(async () => {
      try {
        const result = await getClientMenuHistory(clientId)
        if (result.error) {
          setError(result.error)
          return
        }
        setEntries(result.data)
        setError(null)
      } catch (err) {
        console.error('[MenuHistoryTimeline] load error', err)
        setError('Failed to load menu history')
      }
    })
  }

  // Filter by date range
  const filteredEntries = entries.filter((entry) => {
    if (dateFrom && entry.served_date < dateFrom) return false
    if (dateTo && entry.served_date > dateTo) return false
    return true
  })

  // Toggle expanded
  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  // Render star rating
  function renderStars(rating: number | null) {
    if (rating === null) return <span className="text-gray-400 text-sm">No rating</span>
    return (
      <span className="text-amber-500">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i}>{i < rating ? '\u2605' : '\u2606'}</span>
        ))}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Menu History</h3>
        <div className="flex gap-2">
          <button
            onClick={loadEntries}
            disabled={isPending}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            {isPending ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 text-sm bg-brand-600 text-white hover:bg-brand-700 rounded-md transition-colors"
          >
            Log Menu
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Date filter */}
      <div className="flex gap-3 items-center text-sm">
        <label className="text-gray-600">From:</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-2 py-1 border rounded-md text-sm"
        />
        <label className="text-gray-600">To:</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-2 py-1 border rounded-md text-sm"
        />
        {(dateFrom || dateTo) && (
          <button
            onClick={() => {
              setDateFrom('')
              setDateTo('')
            }}
            className="text-brand-600 hover:underline text-sm"
          >
            Clear
          </button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <AddMenuForm
          clientId={clientId}
          onSaved={(entry) => {
            setEntries((prev) => [entry, ...prev])
            setShowAddForm(false)
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Timeline */}
      {filteredEntries.length === 0 ? (
        <p className="text-gray-500 text-sm py-4 text-center">
          No menu history found for this client.
        </p>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const isExpanded = expandedId === entry.id
            const dishes = entry.dishes_served ?? []

            return (
              <div key={entry.id} className="border rounded-lg overflow-hidden">
                {/* Summary row */}
                <button
                  onClick={() => toggleExpanded(entry.id)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {new Date(entry.served_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-gray-500 text-sm">
                      {dishes.length} dish{dishes.length !== 1 ? 'es' : ''}
                    </span>
                    {entry.guest_count && (
                      <span className="text-gray-400 text-sm">
                        {entry.guest_count} guest{entry.guest_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {renderStars(entry.overall_rating)}
                    <span className="text-gray-400 text-sm">
                      {isExpanded ? '\u25B2' : '\u25BC'}
                    </span>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t bg-gray-50 space-y-3">
                    {/* Dishes */}
                    <div className="pt-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Dishes</h4>
                      <div className="space-y-1">
                        {dishes.map((dish, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span>{dish.name}</span>
                            {dish.category && (
                              <span className="text-xs text-gray-400">({dish.category})</span>
                            )}
                            {dish.liked && (
                              <span className="text-green-600 text-xs font-medium">Liked</span>
                            )}
                            {dish.disliked && (
                              <span className="text-red-600 text-xs font-medium">Disliked</span>
                            )}
                            {dish.notes && (
                              <span className="text-gray-500 text-xs italic">{dish.notes}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Feedback */}
                    {entry.client_feedback && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Client Feedback</h4>
                        <p className="text-sm text-gray-600 mt-1">{entry.client_feedback}</p>
                      </div>
                    )}

                    {/* Chef notes */}
                    {entry.chef_notes && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Chef Notes</h4>
                        <p className="text-sm text-gray-600 mt-1">{entry.chef_notes}</p>
                      </div>
                    )}

                    {/* Inline feedback edit */}
                    <InlineFeedbackEdit
                      entry={entry}
                      onUpdated={(updated) => {
                        setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// -- Add Menu Form --

function AddMenuForm({
  clientId,
  onSaved,
  onCancel,
}: {
  clientId: string
  onSaved: (entry: HistoryEntry) => void
  onCancel: () => void
}) {
  const [servedDate, setServedDate] = useState(() => todayLocalDateString())
  const [dishesText, setDishesText] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState('')
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Parse dishes from comma-separated text
    const dishNames = dishesText
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)

    if (dishNames.length === 0) {
      setFormError('Enter at least one dish name')
      return
    }

    const dishes: DishEntry[] = dishNames.map((name) => ({ name }))

    startTransition(async () => {
      try {
        const result = await addMenuHistoryEntry({
          client_id: clientId,
          served_date: servedDate,
          dishes_served: dishes,
          guest_count: guestCount ? parseInt(guestCount, 10) : null,
          chef_notes: notes || null,
          overall_rating: rating ? parseInt(rating, 10) : null,
        })
        if (result.error) {
          setFormError(result.error)
          return
        }
        if (result.data) {
          onSaved(result.data)
        }
      } catch (err) {
        console.error('[AddMenuForm] error', err)
        setFormError('Failed to save entry')
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-brand-50 border border-brand-200 rounded-lg space-y-3"
    >
      <h4 className="text-sm font-semibold">Log a Menu</h4>

      {formError && <p className="text-red-600 text-sm">{formError}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-600 block mb-1">Date Served</label>
          <input
            type="date"
            value={servedDate}
            onChange={(e) => setServedDate(e.target.value)}
            required
            className="w-full px-2 py-1.5 border rounded-md text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 block mb-1">Guest Count</label>
          <input
            type="number"
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
            min="1"
            className="w-full px-2 py-1.5 border rounded-md text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-600 block mb-1">Dishes (comma-separated)</label>
        <textarea
          value={dishesText}
          onChange={(e) => setDishesText(e.target.value)}
          placeholder="Seared salmon, Risotto, Chocolate mousse"
          rows={2}
          className="w-full px-2 py-1.5 border rounded-md text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-600 block mb-1">Rating (1-5)</label>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="w-full px-2 py-1.5 border rounded-md text-sm"
          >
            <option value="">No rating</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-600 block mb-1">Chef Notes</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-2 py-1.5 border rounded-md text-sm"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-3 py-1.5 text-sm bg-brand-600 text-white hover:bg-brand-700 rounded-md disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}

// -- Inline Feedback Edit --

function InlineFeedbackEdit({
  entry,
  onUpdated,
}: {
  entry: HistoryEntry
  onUpdated: (updated: HistoryEntry) => void
}) {
  const [editing, setEditing] = useState(false)
  const [feedbackText, setFeedbackText] = useState(entry.client_feedback ?? '')
  const [notesText, setNotesText] = useState(entry.chef_notes ?? '')
  const [ratingVal, setRatingVal] = useState(entry.overall_rating?.toString() ?? '')
  const [isPending, startTransition] = useTransition()

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="text-brand-600 hover:underline text-sm">
        Edit feedback
      </button>
    )
  }

  function handleSave() {
    const previous = { ...entry }
    const updated: HistoryEntry = {
      ...entry,
      client_feedback: feedbackText || null,
      chef_notes: notesText || null,
      overall_rating: ratingVal ? parseInt(ratingVal, 10) : null,
    }

    // Optimistic update
    onUpdated(updated)

    startTransition(async () => {
      try {
        const result = await updateMenuFeedback(entry.id, {
          client_feedback: feedbackText || null,
          chef_notes: notesText || null,
          overall_rating: ratingVal ? parseInt(ratingVal, 10) : null,
        })
        if (!result.success) {
          // Rollback on failure
          onUpdated(previous)
          console.error('[InlineFeedbackEdit]', result.error)
        }
        setEditing(false)
      } catch (err) {
        // Rollback on failure
        onUpdated(previous)
        console.error('[InlineFeedbackEdit] error', err)
      }
    })
  }

  return (
    <div className="space-y-2 pt-2 border-t">
      <div>
        <label className="text-xs text-gray-600">Client Feedback</label>
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          rows={2}
          className="w-full px-2 py-1 border rounded-md text-sm mt-1"
        />
      </div>
      <div>
        <label className="text-xs text-gray-600">Chef Notes</label>
        <input
          type="text"
          value={notesText}
          onChange={(e) => setNotesText(e.target.value)}
          className="w-full px-2 py-1 border rounded-md text-sm mt-1"
        />
      </div>
      <div>
        <label className="text-xs text-gray-600">Rating</label>
        <select
          value={ratingVal}
          onChange={(e) => setRatingVal(e.target.value)}
          className="ml-2 px-2 py-1 border rounded-md text-sm"
        >
          <option value="">None</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-3 py-1 text-sm bg-brand-600 text-white rounded-md disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
