'use client'

// Interactive Packing List — check off items while physically packing the car
// State is localStorage (keyed by eventId) — no server roundtrip per checkbox.
// Packing happens under time pressure; we can't afford network latency.
// Only the final "Mark Car Packed" action writes to the server.

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { markCarPacked, resetPackingStatus, togglePackingConfirmation } from '@/lib/packing/actions'
import type { PackingListData } from '@/lib/documents/generate-packing-list'

// ─── Types ────────────────────────────────────────────────────────────────────

type CheckedState = Record<string, boolean>

type PackingListClientProps = {
  eventId: string
  packingData: PackingListData
  alreadyPacked: boolean
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({
  id,
  label,
  sublabel,
  checked,
  onToggle,
}: {
  id: string
  label: string
  sublabel?: string
  checked: boolean
  onToggle: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
        checked
          ? 'bg-green-950 border border-green-200'
          : 'bg-surface border border-stone-700 hover:bg-stone-800'
      }`}
    >
      {/* Large checkbox — easy to tap on mobile */}
      <div
        className={`flex-shrink-0 w-7 h-7 rounded border-2 flex items-center justify-center mt-0.5 ${
          checked ? 'bg-green-9500 border-green-500' : 'border-stone-400 bg-surface'
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
          className={`text-sm font-medium ${checked ? 'line-through text-stone-400' : 'text-stone-100'}`}
        >
          {label}
        </span>
        {sublabel && <span className="block text-xs text-stone-400 mt-0.5">{sublabel}</span>}
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
  onToggle,
  warning,
}: {
  title: string
  subtitle?: string
  items: { id: string; label: string; sublabel?: string }[]
  checkedState: CheckedState
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
              : 'bg-stone-800 text-stone-400'
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
            onToggle={onToggle}
          />
        ))}
      </div>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PackingListClient({ eventId, packingData, alreadyPacked }: PackingListClientProps) {
  const storageKey = `packing-${eventId}`

  const {
    coldItems,
    frozenItems,
    roomTempItems,
    fragileItems,
    standardKitItems,
    mustBringEquipment,
    eventEquipment,
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

  const allEquipment = [...kitSection, ...clientEquipmentSection, ...eventEquipmentSection]

  // All items in a flat list for total progress calculation
  const allItems = [
    ...coldSection,
    ...frozenSection,
    ...roomTempSection,
    ...fragileSection,
    ...allEquipment,
  ]

  // ─── State ──────────────────────────────────────────────────────────────────

  const [checked, setChecked] = useState<CheckedState>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(alreadyPacked)
  const [error, setError] = useState<string | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        setChecked(JSON.parse(saved))
      }
    } catch {
      // localStorage unavailable (SSR safety, private browsing)
    }
  }, [storageKey])

  const toggle = useCallback(
    (id: string) => {
      setChecked((prev) => {
        const newValue = !prev[id]
        const next = { ...prev, [id]: newValue }
        try {
          localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {
          // ignore
        }
        // Sync to DB in background — fire-and-forget, localStorage is source of truth
        togglePackingConfirmation(eventId, id, newValue).catch(() => {})
        return next
      })
    },
    [storageKey, eventId]
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

  // ─── Progress ───────────────────────────────────────────────────────────────

  const totalItems = allItems.length
  const checkedCount = allItems.filter((item) => checked[item.id]).length
  const allChecked = totalItems > 0 && checkedCount === totalItems

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Overall progress bar */}
      <div className="bg-surface border border-stone-700 rounded-lg px-4 py-3">
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
            className="bg-green-9500 h-2 rounded-full transition-all duration-300"
            style={{ width: totalItems > 0 ? `${(checkedCount / totalItems) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Food sections */}
      <Section
        title="Cooler — Cold Items"
        subtitle="Pack proteins on bottom, sauces upright. Lids secured."
        items={coldSection}
        checkedState={checked}
        onToggle={toggle}
      />

      <Section
        title="Cooler — Frozen (pack last)"
        subtitle="Pack on top of ice packs, last into the cooler before leaving."
        items={frozenSection}
        checkedState={checked}
        onToggle={toggle}
        warning="PACK LAST — right before walking out the door."
      />

      <Section
        title="Dry Bag — Room Temp"
        subtitle="No contact with ice packs."
        items={roomTempSection}
        checkedState={checked}
        onToggle={toggle}
      />

      <Section
        title="Fragile — Own Container"
        subtitle="Nothing stacked on top. Handle separately."
        items={fragileSection}
        checkedState={checked}
        onToggle={toggle}
      />

      {/* Equipment */}
      <Section
        title="Equipment"
        subtitle="Standard kit + client and event-specific items."
        items={allEquipment}
        checkedState={checked}
        onToggle={toggle}
      />

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
                  Course {courseNumber} — {courseName}
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
            <p className="text-green-700 font-semibold text-lg">Car packed. Have a great dinner!</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleReset}
          className="w-full text-xs text-stone-400 hover:text-stone-400 py-2"
        >
          Reset checklist
        </button>
      </div>
    </div>
  )
}
