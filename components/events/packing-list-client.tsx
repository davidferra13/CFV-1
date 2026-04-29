'use client'

// Interactive Packing List - check off items while physically packing the car
// State is localStorage (keyed by eventId) - no server roundtrip per checkbox.
// Packing happens under time pressure; we can't afford network latency.
// Only the final "Mark Car Packed" action writes to the server.

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { markCarPacked, resetPackingStatus, togglePackingConfirmation } from '@/lib/packing/actions'
import type { PackingListData } from '@/lib/documents/generate-packing-list'
import type { EventWeather } from '@/lib/weather/open-meteo'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

type CheckedState = Record<string, boolean>

type PackingListClientProps = {
  eventId: string
  packingData: PackingListData
  alreadyPacked: boolean
  weather?: EventWeather | null
}

// ─── Weather Suggestion Logic (deterministic - Formula > AI) ─────────────────

type WeatherSuggestion = {
  label: string
  items: string[]
  severity: 'warning' | 'info'
}

function getWeatherSuggestions(weather: EventWeather): WeatherSuggestion[] {
  const suggestions: WeatherSuggestion[] = []

  // Rain/storms: weatherCode 51-99 covers drizzle, rain, snow, showers, thunderstorms
  if (weather.weatherCode >= 51 && weather.weatherCode <= 99) {
    suggestions.push({
      label: 'Rain / Storm Gear',
      items: [
        'Tarps or canopy cover',
        'Waterproof bags for equipment',
        'Umbrella',
        'Non-slip mats',
        'Extra towels',
      ],
      severity: 'warning',
    })
  }

  // Hot weather
  if (weather.tempMaxF > 90) {
    suggestions.push({
      label: 'Heat Precautions',
      items: [
        'Extra ice and cooler bags',
        'Portable fan',
        'Sunscreen',
        'Extra water (personal + cooking)',
        'Insulated food covers',
      ],
      severity: 'warning',
    })
  }

  // Cold weather
  if (weather.tempMinF < 40) {
    suggestions.push({
      label: 'Cold Weather Gear',
      items: [
        'Hand warmers',
        'Insulated food containers',
        'Thermal bags',
        'Hot beverage supplies (thermos, tea, coffee)',
        'Extra sterno fuel (if buffet)',
      ],
      severity: 'warning',
    })
  }

  // Snow specifically (weatherCode 71-77, 85-86)
  if (
    (weather.weatherCode >= 71 && weather.weatherCode <= 77) ||
    (weather.weatherCode >= 85 && weather.weatherCode <= 86)
  ) {
    suggestions.push({
      label: 'Snow Conditions',
      items: [
        'Allow extra travel time',
        'Non-slip footwear',
        'Ice scraper for windshield',
        'Road salt or kitty litter (traction)',
      ],
      severity: 'warning',
    })
  }

  return suggestions
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({
  id,
  label,
  sublabel,
  checked,
  pending,
  onToggle,
}: {
  id: string
  label: string
  sublabel?: string
  checked: boolean
  pending?: boolean
  onToggle: (id: string) => void
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => onToggle(id)}
      className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
        checked
          ? 'bg-green-950 border border-green-200'
          : 'bg-stone-900 border border-stone-700 hover:bg-stone-800'
      } ${pending ? 'cursor-wait opacity-75' : ''}`}
    >
      {/* Large checkbox - easy to tap on mobile */}
      <div
        className={`flex-shrink-0 w-7 h-7 rounded border-2 flex items-center justify-center mt-0.5 ${
          checked ? 'bg-green-500 border-green-500' : 'border-stone-400 bg-stone-900'
        }`}
      >
        {checked && (
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-medium ${checked ? 'line-through text-stone-300' : 'text-stone-100'}`}
        >
          {label}
        </span>
        {sublabel && <span className="block text-xs text-stone-300 mt-0.5">{sublabel}</span>}
        {pending && <span className="block text-xs text-stone-400 mt-0.5">Saving...</span>}
      </div>
    </button>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  items,
  checkedState,
  pendingItemIds,
  onToggle,
  warning,
}: {
  title: string
  subtitle?: string
  items: { id: string; label: string; sublabel?: string }[]
  checkedState: CheckedState
  pendingItemIds: Set<string>
  onToggle: (id: string) => void
  warning?: string
}) {
  if (items.length === 0) return null

  const checkedCount = items.filter((item) => checkedState[item.id]).length

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-stone-100 text-sm uppercase tracking-wide">{title}</h3>
          {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            checkedCount === items.length
              ? 'bg-green-900 text-green-700'
              : 'bg-stone-800 text-stone-300'
          }`}
        >
          {checkedCount} / {items.length}
        </span>
      </div>
      {warning && (
        <p className="text-xs text-amber-700 bg-amber-950 border border-amber-200 rounded px-2 py-1">
          {warning}
        </p>
      )}
      <div className="space-y-1.5">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            id={item.id}
            label={item.label}
            sublabel={item.sublabel}
            checked={checkedState[item.id] ?? false}
            pending={pendingItemIds.has(item.id)}
            onToggle={onToggle}
          />
        ))}
      </div>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PackingListClient({
  eventId,
  packingData,
  alreadyPacked,
  weather,
}: PackingListClientProps) {
  const storageKey = `packing-${eventId}`

  const {
    coldItems,
    frozenItems,
    roomTempItems,
    fragileItems,
    standardKitItems,
    mustBringEquipment,
    eventEquipment,
    servicewareItems,
    personalGear,
    courseVerification,
    totalFoodItems,
  } = packingData

  // Build all item lists with stable IDs
  const coldSection = coldItems.map((item, i) => ({
    id: `cold-${i}`,
    label: item.name,
    sublabel: item.storage_notes
      ? `${item.storage_notes} · Course ${item.course_number}`
      : `Course ${item.course_number}`,
  }))

  const frozenSection = frozenItems.map((item, i) => ({
    id: `frozen-${i}`,
    label: item.name,
    sublabel: item.storage_notes
      ? `${item.storage_notes} · Course ${item.course_number}`
      : `Course ${item.course_number}`,
  }))

  const roomTempSection = roomTempItems.map((item, i) => ({
    id: `room-${i}`,
    label: item.name,
    sublabel: item.storage_notes
      ? `${item.storage_notes} · Course ${item.course_number}`
      : `Course ${item.course_number}`,
  }))

  const fragileSection = fragileItems.map((item, i) => ({
    id: `fragile-${i}`,
    label: item.name,
    sublabel: item.storage_notes
      ? `${item.storage_notes} · Course ${item.course_number}`
      : `Course ${item.course_number}`,
  }))

  const kitSection = standardKitItems.map((item, i) => ({
    id: `kit-${i}`,
    label: item,
  }))

  const clientEquipmentSection = mustBringEquipment.map((item, i) => ({
    id: `client-eq-${i}`,
    label: item,
    sublabel: 'Client-specific',
  }))

  const eventEquipmentSection = eventEquipment.map((item, i) => ({
    id: `event-eq-${i}`,
    label: item,
    sublabel: 'This event',
  }))

  const servicewareSection = servicewareItems.map((item, i) => ({
    id: `sw-${i}`,
    label: item,
  }))

  const gearSection = personalGear.map((item, i) => ({
    id: `gear-${i}`,
    label: item.name,
    sublabel: item.category,
  }))

  const allEquipment = [...kitSection, ...clientEquipmentSection, ...eventEquipmentSection]

  // All items in a flat list for total progress calculation
  const allItems = [
    ...coldSection,
    ...frozenSection,
    ...roomTempSection,
    ...fragileSection,
    ...allEquipment,
    ...servicewareSection,
    ...gearSection,
  ]

  // ─── State ──────────────────────────────────────────────────────────────────

  const [checked, setChecked] = useState<CheckedState>({})
  const [pendingItemIds, setPendingItemIds] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(alreadyPacked)
  const [error, setError] = useState<string | null>(null)
  const [customItems, setCustomItems] = useState<string[]>([])
  const [newCustomItem, setNewCustomItem] = useState('')
  const customStorageKey = `cf-pack-custom-${eventId}`

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        setChecked(JSON.parse(saved))
      }
      const savedCustom = localStorage.getItem(customStorageKey)
      if (savedCustom) {
        setCustomItems(JSON.parse(savedCustom))
      }
    } catch {
      // localStorage unavailable (SSR safety, private browsing)
    }
  }, [storageKey, customStorageKey])

  const persistCheckedState = useCallback(
    (next: CheckedState) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // localStorage may be unavailable in private browsing.
      }
    },
    [storageKey]
  )

  const toggle = useCallback(
    (id: string) => {
      if (pendingItemIds.has(id)) return

      setPendingItemIds((prev) => new Set(prev).add(id))

      const previousValue = checked[id] ?? false
      const newValue = !previousValue

      setChecked((prev) => {
        const next = { ...prev, [id]: newValue }
        persistCheckedState(next)
        return next
      })

      togglePackingConfirmation(eventId, id, newValue)
        .then((result) => {
          if (!result.success || result.confirmed !== newValue) {
            setChecked((current) => {
              const next = { ...current, [id]: previousValue }
              persistCheckedState(next)
              return next
            })
            toast.error(result.error ?? 'Failed to save packing confirmation.')
          }
        })
        .catch(() => {
          setChecked((current) => {
            const next = { ...current, [id]: previousValue }
            persistCheckedState(next)
            return next
          })
          toast.error('Failed to save packing confirmation.')
        })
        .finally(() => {
          setPendingItemIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        })
    },
    [checked, eventId, pendingItemIds, persistCheckedState]
  )

  const handleMarkPacked = async () => {
    setIsSubmitting(true)
    setError(null)
    const result = await markCarPacked(eventId)
    if (result.success) {
      setSubmitted(true)
    } else {
      setError(result.error ?? 'Failed to mark car packed')
    }
    setIsSubmitting(false)
  }

  const handleReset = async () => {
    // Clear localStorage
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
    setChecked({})

    if (submitted) {
      const result = await resetPackingStatus(eventId)
      if (result.success) {
        setSubmitted(false)
      }
    }
  }

  // ─── Custom Items ─────────────────────────────────────────────────────────

  const addCustomItem = useCallback(() => {
    const trimmed = newCustomItem.trim()
    if (!trimmed) return
    setCustomItems((prev) => {
      const next = [...prev, trimmed]
      try {
        localStorage.setItem(customStorageKey, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
    setNewCustomItem('')
  }, [newCustomItem, customStorageKey])

  const removeCustomItem = useCallback(
    (index: number) => {
      setCustomItems((prev) => {
        const next = prev.filter((_, i) => i !== index)
        try {
          localStorage.setItem(customStorageKey, JSON.stringify(next))
        } catch {
          /* ignore */
        }
        return next
      })
    },
    [customStorageKey]
  )

  const customSection = customItems.map((item, i) => ({
    id: `custom-${i}`,
    label: item,
  }))

  // ─── Progress ───────────────────────────────────────────────────────────────

  const allWithCustom = [...allItems, ...customSection]
  const totalItems = allWithCustom.length
  const checkedCount = allWithCustom.filter((item) => checked[item.id]).length
  const allChecked = totalItems > 0 && checkedCount === totalItems

  // ─── Render ─────────────────────────────────────────────────────────────────

  // ─── Weather Suggestions (deterministic) ────────────────────────────────────

  const weatherSuggestions = weather ? getWeatherSuggestions(weather) : []
  const precipIn = weather ? (weather.precipitationMm / 25.4).toFixed(2) : '0'
  const hasPrecip = weather ? weather.precipitationMm > 0.1 : false

  return (
    <div className="space-y-4">
      {/* Weather banner - shown only when weather data is available */}
      {weather && (
        <Card className="p-4 border-brand-800 bg-brand-950/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl" role="img" aria-label={weather.description}>
                {weather.emoji}
              </span>
              <div>
                <p className="text-sm font-semibold text-brand-100">{weather.description}</p>
                <p className="text-xs text-brand-300">
                  {weather.tempMinF}° – {weather.tempMaxF}°F
                  {hasPrecip && <span className="ml-2">· {precipIn}&quot; precip</span>}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xxs text-brand-400 uppercase tracking-wide">
                {weather.isHistorical ? 'Actual' : 'Forecast'}
              </p>
              <p className="text-xxs text-brand-500">Open-Meteo</p>
            </div>
          </div>

          {/* Weather-triggered packing suggestions */}
          {weatherSuggestions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-brand-800/50 space-y-2">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                Weather Alert - Pack These
              </p>
              {weatherSuggestions.map((suggestion) => (
                <div key={suggestion.label}>
                  <p className="text-xs font-medium text-stone-200">{suggestion.label}</p>
                  <ul className="mt-1 space-y-0.5">
                    {suggestion.items.map((item) => (
                      <li key={item} className="text-xs text-stone-300 flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Clear/mild - no alerts needed */}
          {weatherSuggestions.length === 0 && (
            <p className="mt-2 text-xs text-brand-400">
              Great weather - standard packing should be fine.
            </p>
          )}
        </Card>
      )}

      {/* Overall progress bar */}
      <div className="bg-stone-900 border border-stone-700 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-stone-300">
            {checkedCount} of {totalItems} items packed
          </span>
          {allChecked && !submitted && (
            <span className="text-xs text-emerald-600 font-medium">All items checked!</span>
          )}
        </div>
        <div className="w-full bg-stone-800 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: totalItems > 0 ? `${(checkedCount / totalItems) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Food sections */}
      <Section
        title="Cooler - Cold Items"
        subtitle="Pack proteins on bottom, sauces upright. Lids secured."
        items={coldSection}
        checkedState={checked}
        pendingItemIds={pendingItemIds}
        onToggle={toggle}
      />

      <Section
        title="Cooler - Frozen (pack last)"
        subtitle="Pack on top of ice packs, last into the cooler before leaving."
        items={frozenSection}
        checkedState={checked}
        pendingItemIds={pendingItemIds}
        onToggle={toggle}
        warning="PACK LAST - right before walking out the door."
      />

      <Section
        title="Dry Bag - Room Temp"
        subtitle="No contact with ice packs."
        items={roomTempSection}
        checkedState={checked}
        pendingItemIds={pendingItemIds}
        onToggle={toggle}
      />

      <Section
        title="Fragile - Own Container"
        subtitle="Nothing stacked on top. Handle separately."
        items={fragileSection}
        checkedState={checked}
        pendingItemIds={pendingItemIds}
        onToggle={toggle}
      />

      {/* Equipment */}
      <Section
        title="Equipment"
        subtitle="Standard kit + client and event-specific items."
        items={allEquipment}
        checkedState={checked}
        pendingItemIds={pendingItemIds}
        onToggle={toggle}
      />

      {/* Serviceware */}
      <Section
        title="Serviceware"
        subtitle="Plates, flatware, glassware, and serving pieces."
        items={servicewareSection}
        checkedState={checked}
        pendingItemIds={pendingItemIds}
        onToggle={toggle}
      />

      {/* Personal Gear */}
      <Section
        title="Personal Gear"
        subtitle="Chef uniform, tools, and compliance items."
        items={gearSection}
        checkedState={checked}
        pendingItemIds={pendingItemIds}
        onToggle={toggle}
      />

      {/* Custom Items */}
      <Card className="p-4 space-y-2">
        <h3 className="font-semibold text-stone-100 text-sm uppercase tracking-wide">
          Custom Items
        </h3>
        <p className="text-xs text-stone-500">Event-specific items not in the standard list.</p>
        {customSection.length > 0 && (
          <div className="space-y-1.5">
            {customSection.map((item, i) => (
              <div key={item.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <ItemRow
                    id={item.id}
                    label={item.label}
                    checked={checked[item.id] ?? false}
                    pending={pendingItemIds.has(item.id)}
                    onToggle={toggle}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeCustomItem(i)}
                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1 flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={newCustomItem}
            onChange={(e) => setNewCustomItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCustomItem()
              }
            }}
            placeholder="Add custom item..."
            className="flex-1 px-3 py-2 text-sm bg-stone-900 border border-stone-700 rounded-lg text-stone-200 placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
          <Button
            onClick={addCustomItem}
            variant="secondary"
            disabled={!newCustomItem.trim()}
            className="text-sm"
          >
            Add
          </Button>
        </div>
      </Card>

      {/* Component verification */}
      {courseVerification.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-stone-100 text-sm uppercase tracking-wide mb-2">
            Component Verification
          </h3>
          <div className="space-y-1">
            {courseVerification.map(({ courseNumber, courseName, count }) => (
              <div key={courseNumber} className="flex items-center justify-between text-sm">
                <span className="text-stone-300">
                  Course {courseNumber} - {courseName}
                </span>
                <span className="text-stone-500 font-medium">
                  {count} item{count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm border-t border-stone-800 pt-1 mt-1">
              <span className="text-stone-100 font-semibold">Total food items</span>
              <span className="text-stone-100 font-bold">{totalFoodItems}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Mark Car Packed / Reset */}
      <div className="space-y-2 pt-2">
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        {!submitted ? (
          <Button
            onClick={handleMarkPacked}
            disabled={!allChecked || isSubmitting}
            className="w-full"
            variant="primary"
          >
            {isSubmitting
              ? 'Saving...'
              : allChecked
                ? 'Mark Car Packed'
                : `${totalItems - checkedCount} items remaining`}
          </Button>
        ) : (
          <div className="text-center py-2">
            <p className="text-green-700 font-semibold text-lg">
              Car packed. Have a great service!
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleReset}
          className="w-full text-xs text-stone-300 hover:text-stone-300 py-2"
        >
          Reset checklist
        </button>
      </div>
    </div>
  )
}
