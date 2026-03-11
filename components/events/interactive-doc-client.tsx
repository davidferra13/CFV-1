'use client'

// Interactive Document Client
// 3-state per-item toggle: 0 = untouched, 1 = working on (amber →), 2 = done (green ✓ strikethrough)
// State is localStorage-only — no server roundtrip per tap. Works offline.
// Reset clears localStorage back to initialState defaults (e.g. pre-sourced items re-cross).

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import type {
  InteractiveDocSpec,
  InteractiveItem,
  ItemState,
} from '@/lib/documents/interactive-specs'

type StateMap = Record<string, ItemState>

export type InteractiveDocClientProps = {
  eventId: string
  docType: string
  spec: InteractiveDocSpec
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildInitialState(spec: InteractiveDocSpec): StateMap {
  const initial: StateMap = {}
  for (const section of spec.sections) {
    for (const item of section.items) {
      if (item.initialState !== undefined) {
        initial[item.id] = item.initialState
      }
    }
  }
  return initial
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  state,
  onToggle,
}: {
  item: InteractiveItem
  state: ItemState
  onToggle: (id: string) => void
}) {
  // Non-checkable = informational text only, no tap target
  if (!item.checkable) {
    return (
      <div className="px-3 py-2">
        <p className="text-sm text-stone-300">{item.label}</p>
        {item.sublabel && <p className="text-xs text-stone-300 mt-0.5">{item.sublabel}</p>}
      </div>
    )
  }

  const bgClass =
    state === 2
      ? 'bg-green-950 border-green-200'
      : state === 1
        ? 'bg-amber-950 border-amber-300'
        : 'bg-stone-900 border-stone-700 hover:bg-stone-800'

  const textClass = state === 2 ? 'line-through text-stone-300' : 'text-stone-100'

  return (
    <button
      type="button"
      onClick={() => onToggle(item.id)}
      className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-colors border ${bgClass}`}
    >
      {/* 3-state indicator */}
      <div
        className={`flex-shrink-0 w-7 h-7 rounded border-2 flex items-center justify-center mt-0.5 ${
          state === 2
            ? 'bg-green-500 border-green-500'
            : state === 1
              ? 'border-amber-400 bg-amber-950'
              : 'border-stone-400 bg-stone-900'
        }`}
      >
        {state === 2 && (
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
        {state === 1 && <span className="text-amber-500 font-bold text-sm leading-none">→</span>}
      </div>

      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${textClass}`}>{item.label}</span>
        {item.sublabel && (
          <span className="block text-xs text-stone-300 mt-0.5">{item.sublabel}</span>
        )}
      </div>
    </button>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  section,
  stateMap,
  onToggle,
}: {
  section: InteractiveDocSpec['sections'][0]
  stateMap: StateMap
  onToggle: (id: string) => void
}) {
  if (section.items.length === 0) return null

  const checkable = section.items.filter((i) => i.checkable)
  const doneCount = checkable.filter((i) => stateMap[i.id] === 2).length
  const inProgressCount = checkable.filter((i) => stateMap[i.id] === 1).length
  const allDone = checkable.length > 0 && doneCount === checkable.length
  const anyInProgress = inProgressCount > 0

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-stone-100 text-sm uppercase tracking-wide">
            {section.title}
          </h3>
          {section.subtitle && <p className="text-xs text-stone-500 mt-0.5">{section.subtitle}</p>}
        </div>
        {checkable.length > 0 && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              allDone
                ? 'bg-green-900 text-green-200'
                : anyInProgress
                  ? 'bg-amber-900 text-amber-200'
                  : 'bg-stone-800 text-stone-300'
            }`}
          >
            {doneCount} / {checkable.length}
          </span>
        )}
      </div>

      {section.warning && (
        <p className="text-xs text-amber-200 bg-amber-950 border border-amber-200 rounded px-2 py-1.5">
          {section.warning}
        </p>
      )}

      <div className="space-y-1.5">
        {section.items.map((item) => (
          <ItemRow key={item.id} item={item} state={stateMap[item.id] ?? 0} onToggle={onToggle} />
        ))}
      </div>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InteractiveDocClient({ eventId, docType, spec }: InteractiveDocClientProps) {
  const storageKey = `doc-${eventId}-${docType}`

  const [stateMap, setStateMap] = useState<StateMap>(() => buildInitialState(spec))

  // Merge saved localStorage on mount — user's explicit taps override initialState defaults
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved) as StateMap
        setStateMap((prev) => ({ ...prev, ...parsed }))
      }
    } catch {
      // localStorage unavailable (SSR guard, private browsing)
    }
  }, [storageKey])

  const toggle = useCallback(
    (id: string) => {
      setStateMap((prev) => {
        const current = prev[id] ?? 0
        const next = ((current + 1) % 3) as ItemState
        const updated = { ...prev, [id]: next }
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated))
        } catch {
          // ignore
        }
        return updated
      })
    },
    [storageKey]
  )

  const handleReset = () => {
    const initial = buildInitialState(spec)
    setStateMap(initial)
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
  }

  // ─── Progress ─────────────────────────────────────────────────────────────

  const allCheckable = spec.sections.flatMap((s) => s.items.filter((i) => i.checkable))
  const totalCheckable = allCheckable.length
  const doneCount = allCheckable.filter((i) => stateMap[i.id] === 2).length
  const inProgressCount = allCheckable.filter((i) => stateMap[i.id] === 1).length
  const pct = totalCheckable > 0 ? Math.round((doneCount / totalCheckable) * 100) : 0

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Alert banners — allergy / safety warnings */}
      {spec.alerts.map((alert, i) => (
        <div key={i} className="bg-red-950 border border-red-300 rounded-lg px-4 py-3">
          <p className="text-sm font-semibold text-red-200">{alert}</p>
        </div>
      ))}

      {/* Overall progress bar — only when there are checkable items */}
      {totalCheckable > 0 && (
        <div className="bg-stone-900 border border-stone-700 rounded-lg px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-stone-300">
              {doneCount} of {totalCheckable} done
            </span>
            <div className="flex items-center gap-3">
              {inProgressCount > 0 && (
                <span className="text-xs text-amber-600 font-medium">
                  {inProgressCount} in progress
                </span>
              )}
              {pct === 100 && (
                <span className="text-xs text-emerald-600 font-medium">All done!</span>
              )}
            </div>
          </div>
          <div className="w-full bg-stone-800 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Sections */}
      {spec.sections.map((section) => (
        <Section key={section.id} section={section} stateMap={stateMap} onToggle={toggle} />
      ))}

      {/* Legend + reset — only shown when there are checkable items */}
      {totalCheckable > 0 ? (
        <div className="pt-2 space-y-3">
          <div className="flex items-center gap-4 justify-center text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded border-2 border-stone-400 bg-stone-900 inline-flex items-center justify-center" />
              Untouched
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded border-2 border-amber-400 bg-amber-950 inline-flex items-center justify-center text-amber-500 font-bold text-xs leading-none">
                →
              </span>
              Working on
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-green-500 border-2 border-green-500 inline-flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              Done
            </span>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="w-full text-xs text-stone-300 hover:text-stone-300 py-2"
          >
            Reset checklist
          </button>
        </div>
      ) : (
        /* Reference-only docs: no checkboxes — show a clear note instead */
        <p className="pt-2 text-xs text-stone-300 text-center">
          Reference view — tap Open PDF ↗ to print.
        </p>
      )}
    </div>
  )
}
