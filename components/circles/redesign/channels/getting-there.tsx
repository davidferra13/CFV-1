'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { CircleDetail } from '@/lib/hub/circle-detail-actions'

interface Props {
  circle: CircleDetail
}

const SECTIONS = [
  { key: 'address', icon: '📍', title: 'Address' },
  { key: 'parking', icon: '🅿️', title: 'Parking' },
  { key: 'building', icon: '🏢', title: 'Building & Gate Access' },
  { key: 'entry', icon: '🚪', title: 'Entry Instructions' },
  { key: 'elevator', icon: '🛗', title: 'Elevator & Loading Notes' },
  { key: 'contact', icon: '📞', title: 'Arrival Contact' },
  { key: 'window', icon: '🕐', title: 'Arrival Window' },
  { key: 'late', icon: '⏰', title: 'Late Arrival Handling' },
  { key: 'accessible', icon: '♿', title: 'Accessible Entrance' },
  { key: 'rideshare', icon: '🚗', title: 'Rideshare Drop-off' },
  { key: 'coats', icon: '🧥', title: 'Coat & Bag Placement' },
  { key: 'rules', icon: '📋', title: 'House Rules' },
] as const

export function GettingThereChannel({ circle }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))

  // Arrival guide data lives in DinnerCircleConfig.arrivalGuide;
  // CircleDetail does not carry it directly, so we show placeholder state.
  const filledKeys = new Set<string>()

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-stone-100">
          <span>🗺️</span>
          Getting There
        </h2>
        <p className="mt-1 text-sm text-stone-400">
          A complete arrival guide for guests attending{' '}
          <span className="font-medium text-stone-200">{circle.name}</span>
        </p>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SECTIONS.map((section) => {
          const isFilled = filledKeys.has(section.key)
          const isOpen = expanded[section.key] ?? false

          return (
            <button
              key={section.key}
              type="button"
              onClick={() => toggle(section.key)}
              className={cn(
                'flex flex-col rounded-xl border border-stone-700/30 bg-stone-800/50 p-4 text-left transition-all',
                'hover:border-stone-600/50 hover:bg-stone-800/70',
                isOpen && 'ring-1 ring-brand-500/30'
              )}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{section.icon}</span>
                  <span className="text-sm font-semibold text-stone-100">{section.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-block h-2 w-2 rounded-full',
                      isFilled ? 'bg-emerald-400' : 'bg-amber-400'
                    )}
                  />
                  <span className="text-xs text-stone-500">
                    {isFilled ? 'Filled' : 'Needs Info'}
                  </span>
                </div>
              </div>

              {/* Preview / Expanded Body */}
              <div
                className={cn(
                  'mt-3 overflow-hidden text-sm text-stone-400 transition-all',
                  isOpen ? 'max-h-40' : 'max-h-5'
                )}
              >
                <p className="leading-relaxed">
                  {isFilled
                    ? 'Details provided by the host.'
                    : 'Not yet provided. Tap to add details for your guests.'}
                </p>
                {isOpen && (
                  <div className="mt-3 rounded-lg bg-stone-900/60 px-3 py-2 text-xs text-stone-500">
                    This section will be editable once arrival guide configuration is connected.
                  </div>
                )}
              </div>

              {/* Expand indicator */}
              <div className="mt-2 text-xs text-stone-600">
                {isOpen ? '▲ Collapse' : '▼ Expand'}
              </div>
            </button>
          )
        })}
      </div>

      {/* Publish Controls */}
      <div className="flex items-center justify-between rounded-xl border border-stone-700/30 bg-stone-800/50 px-5 py-3">
        <span className="text-xs text-stone-500">Last updated: never</span>
        <button
          type="button"
          disabled
          className={cn(
            'rounded-full px-5 py-2 text-sm font-semibold',
            'bg-brand-500/40 text-brand-200 cursor-not-allowed opacity-60'
          )}
        >
          Publish Guide
        </button>
      </div>
    </div>
  )
}
