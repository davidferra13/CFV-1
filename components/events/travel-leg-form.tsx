'use client'

// Travel Leg Form
// Add or edit a travel leg for an event.
// Sections are collapsible — chef opts in to detail level.

import { useState, useTransition, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  createTravelLeg,
  updateTravelLeg,
  searchIngredientsForEvent,
  upsertLegIngredient,
  deleteLegIngredient,
} from '@/lib/travel/actions'
import type {
  TravelLeg,
  TravelLegWithIngredients,
  TravelStop,
  TravelLegType,
  TravelLocationType,
  TravelLegIngredient,
} from '@/lib/travel/types'
import {
  LEG_TYPE_LABELS,
  LEG_TYPE_DESCRIPTIONS,
  computeLegTotals,
  formatMinutes,
} from '@/lib/travel/types'

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  eventId: string
  eventDate: string // for defaulting leg_date
  leg?: TravelLegWithIngredients | null // null = create mode
  prefillVenueAddress?: string // for service_travel destination
  prefillHomeAddress?: string // for origin defaults
  nearbyEvents?: {
    id: string
    occasion: string | null
    event_date: string
    client_name: string | null
    days_away: number
  }[]
  onSave: (leg: TravelLeg) => void
  onCancel: () => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LEG_TYPES: TravelLegType[] = [
  'specialty_sourcing',
  'grocery_shopping',
  'consolidated_shopping',
  'service_travel',
  'return_home',
  'other',
]

const LOCATION_TYPES: { value: TravelLocationType; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'store', label: 'Store' },
  { value: 'venue', label: 'Venue' },
  { value: 'other', label: 'Other' },
]

// ─── Stop Row ────────────────────────────────────────────────────────────────

function StopRow({
  stop,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  stop: TravelStop
  index: number
  total: number
  onChange: (updated: TravelStop) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <div className="border border-stone-700 rounded-lg p-3 space-y-2 bg-stone-900">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          Stop {index + 1}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1 rounded hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-1 rounded hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded hover:bg-red-950 text-red-500 text-sm"
            title="Remove stop"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-stone-500 mb-1">Name</label>
          <input
            type="text"
            value={stop.name}
            onChange={(e) => onChange({ ...stop, name: e.target.value })}
            placeholder="e.g. Savenor's Market"
            className="w-full border border-stone-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Purpose</label>
          <input
            type="text"
            value={stop.purpose}
            onChange={(e) => onChange({ ...stop, purpose: e.target.value })}
            placeholder="e.g. Pick up A5 Wagyu"
            className="w-full border border-stone-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-stone-500 mb-1">Address</label>
        <input
          type="text"
          value={stop.address}
          onChange={(e) => onChange({ ...stop, address: e.target.value })}
          placeholder="Street address"
          className="w-full border border-stone-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-stone-500 mb-1">Time on-site (min)</label>
          <input
            type="number"
            min={0}
            value={stop.estimated_minutes ?? ''}
            onChange={(e) =>
              onChange({ ...stop, estimated_minutes: parseInt(e.target.value) || 0 })
            }
            placeholder="30"
            className="w-full border border-stone-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Notes</label>
          <input
            type="text"
            value={stop.notes ?? ''}
            onChange={(e) => onChange({ ...stop, notes: e.target.value })}
            placeholder="Any notes"
            className="w-full border border-stone-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Ingredient Row ───────────────────────────────────────────────────────────

function IngredientRow({
  ingredient,
  onUpdate,
  onRemove,
}: {
  ingredient: Partial<TravelLegIngredient> & { _tempId?: string; ingredient_name?: string }
  onUpdate: (updates: Partial<TravelLegIngredient>) => void
  onRemove: () => void
}) {
  return (
    <div className="border border-stone-700 rounded-lg p-3 space-y-2 bg-stone-900">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-stone-200">
          {ingredient.ingredient_name || 'Ingredient'}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-red-500 hover:text-red-700"
        >
          Remove
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-stone-500 mb-1">Qty</label>
          <input
            type="number"
            min={0}
            step="0.1"
            value={ingredient.quantity ?? ''}
            onChange={(e) => onUpdate({ quantity: parseFloat(e.target.value) || null })}
            placeholder="1"
            className="w-full border border-stone-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Unit</label>
          <input
            type="text"
            value={ingredient.unit ?? ''}
            onChange={(e) => onUpdate({ unit: e.target.value || null })}
            placeholder="lbs"
            className="w-full border border-stone-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Store stop</label>
          <input
            type="text"
            value={ingredient.store_name ?? ''}
            onChange={(e) => onUpdate({ store_name: e.target.value || null })}
            placeholder="Stop name"
            className="w-full border border-stone-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-stone-500 mb-1">Notes</label>
        <input
          type="text"
          value={ingredient.notes ?? ''}
          onChange={(e) => onUpdate({ notes: e.target.value || null })}
          placeholder="e.g. Must be fresh, not frozen"
          className="w-full border border-stone-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
    </div>
  )
}

// ─── Main Form ───────────────────────────────────────────────────────────────

export function TravelLegForm({
  eventId,
  eventDate,
  leg,
  prefillVenueAddress,
  prefillHomeAddress,
  nearbyEvents = [],
  onSave,
  onCancel,
}: Props) {
  const isEdit = !!leg

  // Core fields
  const [legType, setLegType] = useState<TravelLegType>(leg?.leg_type ?? 'grocery_shopping')
  const [legDate, setLegDate] = useState(leg?.leg_date ?? eventDate)
  const [departureTime, setDepartureTime] = useState(leg?.departure_time ?? '')
  const [estimatedReturn, setEstimatedReturn] = useState(leg?.estimated_return_time ?? '')
  const [purposeNotes, setPurposeNotes] = useState(leg?.purpose_notes ?? '')

  // Origin
  const [originType, setOriginType] = useState<TravelLocationType>(leg?.origin_type ?? 'home')
  const [originAddress, setOriginAddress] = useState(
    leg?.origin_address ?? prefillHomeAddress ?? ''
  )
  const [originLabel, setOriginLabel] = useState(leg?.origin_label ?? 'Home')

  // Destination
  const [destType, setDestType] = useState<TravelLocationType | null>(leg?.destination_type ?? null)
  const [destAddress, setDestAddress] = useState(
    leg?.destination_address ??
      (legType === 'service_travel' ? (prefillVenueAddress ?? '') : (prefillHomeAddress ?? ''))
  )
  const [destLabel, setDestLabel] = useState(leg?.destination_label ?? '')

  // Drive time
  const [driveMinutes, setDriveMinutes] = useState<number | ''>(leg?.total_drive_minutes ?? '')

  // Stops
  const [stops, setStops] = useState<TravelStop[]>(leg?.stops ?? [])

  // Consolidated event linking
  const [linkedEventIds, setLinkedEventIds] = useState<string[]>(leg?.linked_event_ids ?? [])

  // Ingredients (specialty only)
  type DraftIngredient = Partial<TravelLegIngredient> & {
    _tempId: string
    ingredient_name?: string
  }
  const [ingredients, setIngredients] = useState<DraftIngredient[]>(
    (leg?.ingredients ?? []).map((ing) => ({ ...ing, _tempId: ing.id }))
  )
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [ingredientResults, setIngredientResults] = useState<
    { id: string; name: string; category: string }[]
  >([])
  const [searchingIngredients, setSearchingIngredients] = useState(false)

  // Section expand state
  const [showOriginDest, setShowOriginDest] = useState(true)
  const [showStops, setShowStops] = useState(true)
  const [showTimes, setShowTimes] = useState(true)
  const [showIngredients, setShowIngredients] = useState(legType === 'specialty_sourcing')
  const [showNotes, setShowNotes] = useState(false)
  const [showConsolidation, setShowConsolidation] = useState(legType === 'consolidated_shopping')

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // ─── Computed totals ─────────────────────────────────────────────────────

  const totals = computeLegTotals(stops, typeof driveMinutes === 'number' ? driveMinutes : null)

  // ─── Type change side effects ─────────────────────────────────────────────

  const handleTypeChange = useCallback(
    (type: TravelLegType) => {
      setLegType(type)
      if (type === 'specialty_sourcing') {
        setShowIngredients(true)
      }
      if (type === 'consolidated_shopping') {
        setShowConsolidation(true)
      }
      if (type === 'service_travel') {
        setOriginType('home')
        setOriginAddress(prefillHomeAddress ?? '')
        setOriginLabel('Home')
        setDestType('venue')
        setDestAddress(prefillVenueAddress ?? '')
        setDestLabel('Service venue')
        setLegDate(eventDate)
      }
      if (type === 'return_home') {
        setOriginType('venue')
        setOriginAddress(prefillVenueAddress ?? '')
        setOriginLabel('Service venue')
        setDestType('home')
        setDestAddress(prefillHomeAddress ?? '')
        setDestLabel('Home')
        setLegDate(eventDate)
      }
    },
    [eventDate, prefillHomeAddress, prefillVenueAddress]
  )

  // ─── Stops management ────────────────────────────────────────────────────

  const addStop = () => {
    setStops((prev) => [
      ...prev,
      { order: prev.length, name: '', address: '', purpose: '', estimated_minutes: 30 },
    ])
  }

  const updateStop = (index: number, updated: TravelStop) => {
    setStops((prev) => prev.map((s, i) => (i === index ? updated : s)))
  }

  const removeStop = (index: number) => {
    setStops((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })))
  }

  const moveStop = (index: number, direction: 'up' | 'down') => {
    const next = [...stops]
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setStops(next.map((s, i) => ({ ...s, order: i })))
  }

  // ─── Ingredient search ────────────────────────────────────────────────────

  const handleIngredientSearch = async (q: string) => {
    setIngredientSearch(q)
    if (q.length < 2) {
      setIngredientResults([])
      return
    }
    setSearchingIngredients(true)
    try {
      const results = await searchIngredientsForEvent(eventId, q)
      setIngredientResults(results)
    } catch {
      setIngredientResults([])
    } finally {
      setSearchingIngredients(false)
    }
  }

  const addIngredient = (result: { id: string; name: string; category: string }) => {
    const already = ingredients.some((i) => i.ingredient_id === result.id)
    if (already) return
    setIngredients((prev) => [
      ...prev,
      {
        _tempId: `temp_${Date.now()}`,
        ingredient_id: result.id,
        ingredient_name: result.name,
        quantity: null,
        unit: null,
        store_name: null,
        notes: null,
        status: 'to_source' as const,
        sourced_at: null,
      },
    ])
    setIngredientSearch('')
    setIngredientResults([])
  }

  const updateIngredient = (tempId: string, updates: Partial<TravelLegIngredient>) => {
    setIngredients((prev) => prev.map((i) => (i._tempId === tempId ? { ...i, ...updates } : i)))
  }

  const removeIngredient = (tempId: string) => {
    setIngredients((prev) => prev.filter((i) => i._tempId !== tempId))
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!legDate) {
      setError('Date is required')
      return
    }

    startTransition(async () => {
      try {
        const payload = {
          primary_event_id: eventId,
          linked_event_ids: linkedEventIds,
          leg_type: legType,
          leg_date: legDate,
          departure_time: departureTime || null,
          estimated_return_time: estimatedReturn || null,
          origin_type: originType,
          origin_address: originAddress || null,
          origin_label: originLabel || null,
          destination_type: destType,
          destination_address: destAddress || null,
          destination_label: destLabel || null,
          stops: stops.map((s, i) => ({ ...s, order: i })),
          total_drive_minutes: typeof driveMinutes === 'number' ? driveMinutes : null,
          purpose_notes: purposeNotes || null,
        }

        let savedLeg: TravelLeg
        if (isEdit) {
          savedLeg = await updateTravelLeg({ id: leg!.id, ...payload })
        } else {
          savedLeg = await createTravelLeg(payload)
        }

        // Persist ingredients for specialty legs
        if (legType === 'specialty_sourcing' && ingredients.length > 0) {
          for (const ing of ingredients) {
            if (!ing.ingredient_id) continue
            await upsertLegIngredient({
              leg_id: savedLeg.id,
              ingredient_id: ing.ingredient_id,
              event_id: eventId,
              quantity: ing.quantity ?? null,
              unit: ing.unit ?? null,
              store_name: ing.store_name ?? null,
              notes: ing.notes ?? null,
              status: ing.status ?? 'to_source',
            })
          }

          // Remove deleted ingredients (those in original leg but not in current list)
          if (isEdit && leg?.ingredients) {
            const currentIds = new Set(ingredients.map((i) => i.ingredient_id))
            const removed = leg.ingredients.filter((i) => !currentIds.has(i.ingredient_id))
            for (const r of removed) {
              await deleteLegIngredient(r.id)
            }
          }
        }

        onSave(savedLeg)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save travel leg')
      }
    })
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Leg type + date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Trip type</label>
          <select
            value={legType}
            onChange={(e) => handleTypeChange(e.target.value as TravelLegType)}
            className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-stone-900"
          >
            {LEG_TYPES.map((t) => (
              <option key={t} value={t}>
                {LEG_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <p className="text-xs text-stone-500 mt-1">{LEG_TYPE_DESCRIPTIONS[legType]}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Date</label>
          <input
            type="date"
            value={legDate}
            onChange={(e) => setLegDate(e.target.value)}
            required
            className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Origin & Destination */}
      <div>
        <button
          type="button"
          onClick={() => setShowOriginDest((p) => !p)}
          className="flex items-center gap-2 text-sm font-semibold text-stone-300 hover:text-stone-100 mb-2"
        >
          <span>{showOriginDest ? '▼' : '▶'}</span>
          Origin & Destination
        </button>
        {showOriginDest && (
          <div className="space-y-3 border border-stone-700 rounded-lg p-4 bg-stone-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Origin */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Origin
                </p>
                <select
                  value={originType}
                  onChange={(e) => setOriginType(e.target.value as TravelLocationType)}
                  className="w-full border border-stone-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-stone-900"
                >
                  {LOCATION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={originLabel}
                  onChange={(e) => setOriginLabel(e.target.value)}
                  placeholder="Label (e.g. Home)"
                  className="w-full border border-stone-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <input
                  type="text"
                  value={originAddress}
                  onChange={(e) => setOriginAddress(e.target.value)}
                  placeholder="Address"
                  className="w-full border border-stone-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Destination */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Destination
                </p>
                <select
                  value={destType ?? ''}
                  onChange={(e) => setDestType((e.target.value as TravelLocationType) || null)}
                  className="w-full border border-stone-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-stone-900"
                >
                  <option value="">— select —</option>
                  {LOCATION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={destLabel}
                  onChange={(e) => setDestLabel(e.target.value)}
                  placeholder="Label (e.g. Client's venue)"
                  className="w-full border border-stone-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <input
                  type="text"
                  value={destAddress}
                  onChange={(e) => setDestAddress(e.target.value)}
                  placeholder="Address"
                  className="w-full border border-stone-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timing */}
      <div>
        <button
          type="button"
          onClick={() => setShowTimes((p) => !p)}
          className="flex items-center gap-2 text-sm font-semibold text-stone-300 hover:text-stone-100 mb-2"
        >
          <span>{showTimes ? '▼' : '▶'}</span>
          Timing
        </button>
        {showTimes && (
          <div className="grid grid-cols-3 gap-3 border border-stone-700 rounded-lg p-4 bg-stone-800">
            <div>
              <label className="block text-xs text-stone-500 mb-1">Depart</label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full border border-stone-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Est. return</label>
              <input
                type="time"
                value={estimatedReturn}
                onChange={(e) => setEstimatedReturn(e.target.value)}
                className="w-full border border-stone-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Drive time (min)</label>
              <input
                type="number"
                min={0}
                value={driveMinutes}
                onChange={(e) => setDriveMinutes(parseInt(e.target.value) || '')}
                placeholder="30"
                className="w-full border border-stone-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Stops */}
      <div>
        <button
          type="button"
          onClick={() => setShowStops((p) => !p)}
          className="flex items-center gap-2 text-sm font-semibold text-stone-300 hover:text-stone-100 mb-2"
        >
          <span>{showStops ? '▼' : '▶'}</span>
          Stops ({stops.length})
          {stops.length > 0 && (
            <span className="text-xs text-stone-400 font-normal">
              — {formatMinutes(totals.stop)} on-site
            </span>
          )}
        </button>
        {showStops && (
          <div className="space-y-2">
            {stops.map((stop, index) => (
              <StopRow
                key={index}
                stop={stop}
                index={index}
                total={stops.length}
                onChange={(updated) => updateStop(index, updated)}
                onRemove={() => removeStop(index)}
                onMoveUp={() => moveStop(index, 'up')}
                onMoveDown={() => moveStop(index, 'down')}
              />
            ))}
            <button
              type="button"
              onClick={addStop}
              className="w-full border border-dashed border-stone-600 rounded-lg p-3 text-sm text-stone-500 hover:border-brand-400 hover:text-brand-600 transition-colors"
            >
              + Add stop
            </button>
          </div>
        )}
      </div>

      {/* Consolidated shopping: link other events */}
      {(legType === 'consolidated_shopping' || legType === 'grocery_shopping') &&
        nearbyEvents.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowConsolidation((p) => !p)}
              className="flex items-center gap-2 text-sm font-semibold text-stone-300 hover:text-stone-100 mb-2"
            >
              <span>{showConsolidation ? '▼' : '▶'}</span>
              Also shopping for other events
              {linkedEventIds.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-brand-900 text-brand-400 text-xs">
                  {linkedEventIds.length}
                </span>
              )}
            </button>
            {showConsolidation && (
              <div className="border border-stone-700 rounded-lg p-4 bg-stone-800 space-y-2">
                <p className="text-xs text-stone-500">
                  Check events this shopping run will cover. Their grocery lists will be merged.
                </p>
                {nearbyEvents.map((evt) => (
                  <label key={evt.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkedEventIds.includes(evt.id)}
                      onChange={(e) => {
                        setLinkedEventIds((prev) =>
                          e.target.checked ? [...prev, evt.id] : prev.filter((id) => id !== evt.id)
                        )
                      }}
                      className="w-4 h-4 rounded border-stone-600 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm text-stone-300">
                      {evt.occasion || 'Untitled event'} —{' '}
                      {new Date(evt.event_date).toLocaleDateString()}
                      {evt.client_name && (
                        <span className="text-stone-500"> ({evt.client_name})</span>
                      )}
                      <span className="ml-1 text-xs text-stone-400">
                        ({evt.days_away > 0 ? `+${evt.days_away}` : evt.days_away}d)
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

      {/* Specialty: ingredient linking */}
      {legType === 'specialty_sourcing' && (
        <div>
          <button
            type="button"
            onClick={() => setShowIngredients((p) => !p)}
            className="flex items-center gap-2 text-sm font-semibold text-stone-300 hover:text-stone-100 mb-2"
          >
            <span>{showIngredients ? '▼' : '▶'}</span>
            Ingredients to source ({ingredients.length})
          </button>
          {showIngredients && (
            <div className="space-y-3 border border-stone-700 rounded-lg p-4 bg-stone-800">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={ingredientSearch}
                  onChange={(e) => handleIngredientSearch(e.target.value)}
                  placeholder="Search ingredients from this event's menus…"
                  className="w-full border border-stone-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {searchingIngredients && (
                  <span className="absolute right-3 top-2.5 text-xs text-stone-400">
                    Searching…
                  </span>
                )}
                {ingredientResults.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 bg-stone-900 border border-stone-700 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {ingredientResults.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => addIngredient(r)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-stone-800 flex items-center justify-between"
                      >
                        <span>{r.name}</span>
                        <span className="text-xs text-stone-400 capitalize">{r.category}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Ingredient list */}
              {ingredients.map((ing) => (
                <IngredientRow
                  key={ing._tempId}
                  ingredient={ing}
                  onUpdate={(updates) => updateIngredient(ing._tempId, updates)}
                  onRemove={() => removeIngredient(ing._tempId)}
                />
              ))}
              {ingredients.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-2">
                  No ingredients added yet. Search above to link ingredients from this event.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div>
        <button
          type="button"
          onClick={() => setShowNotes((p) => !p)}
          className="flex items-center gap-2 text-sm font-semibold text-stone-300 hover:text-stone-100 mb-2"
        >
          <span>{showNotes ? '▼' : '▶'}</span>
          Notes
        </button>
        {showNotes && (
          <textarea
            value={purposeNotes}
            onChange={(e) => setPurposeNotes(e.target.value)}
            placeholder="Any notes about this trip…"
            rows={3}
            className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        )}
      </div>

      {/* Total summary */}
      {(totals.drive > 0 || totals.stop > 0) && (
        <div className="flex gap-4 text-sm text-stone-400 bg-stone-800 rounded-lg px-4 py-3 border border-stone-700">
          <span>
            Drive: <strong>{formatMinutes(totals.drive)}</strong>
          </span>
          <span>
            Stops: <strong>{formatMinutes(totals.stop)}</strong>
          </span>
          <span>
            Total: <strong>{formatMinutes(totals.total)}</strong>
          </span>
        </div>
      )}

      {/* Error */}
      {error && <p className="text-sm text-red-600 bg-red-950 rounded px-3 py-2">{error}</p>}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : isEdit ? 'Update trip' : 'Add trip'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
