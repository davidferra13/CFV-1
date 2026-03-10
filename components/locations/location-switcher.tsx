'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import type { BusinessLocation } from '@/lib/locations/location-actions'
import { setActiveLocation } from '@/lib/locations/location-actions'

interface LocationSwitcherProps {
  locations: BusinessLocation[]
  activeLocationId: string | null
  onLocationChange?: (locationId: string | null) => void
}

const TYPE_LABELS: Record<string, string> = {
  kitchen: 'Kitchen',
  storefront: 'Storefront',
  truck: 'Truck',
  commissary: 'Commissary',
  warehouse: 'Warehouse',
  office: 'Office',
}

export function LocationSwitcher({
  locations,
  activeLocationId,
  onLocationChange,
}: LocationSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(activeLocationId)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const activeLocations = locations.filter((l) => l.isActive)
  const current = activeLocations.find((l) => l.id === selected)

  function handleSelect(locationId: string | null) {
    setSelected(locationId)
    setOpen(false)
    startTransition(async () => {
      try {
        if (locationId) {
          await setActiveLocation(locationId)
        }
        onLocationChange?.(locationId)
      } catch {
        // Non-blocking
      }
    })
  }

  if (activeLocations.length === 0) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded-lg text-sm text-stone-300 transition-colors"
        disabled={isPending}
      >
        <svg
          className="w-4 h-4 text-stone-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span className="truncate max-w-[140px]">{current ? current.name : 'All Locations'}</span>
        <svg
          className={`w-3 h-3 text-stone-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-stone-800 border border-stone-600 rounded-lg shadow-xl z-50 py-1">
          <button
            onClick={() => handleSelect(null)}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-stone-700 transition-colors ${
              !selected ? 'text-amber-400 font-medium' : 'text-stone-300'
            }`}
          >
            All Locations
          </button>
          <div className="border-t border-stone-700 my-1" />
          {activeLocations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => handleSelect(loc.id)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-stone-700 transition-colors flex items-center justify-between ${
                selected === loc.id ? 'text-amber-400 font-medium' : 'text-stone-300'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <span>{loc.name}</span>
                {loc.isPrimary && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-900/40 text-amber-400">
                    Primary
                  </span>
                )}
              </span>
              <span className="text-xs text-stone-500 shrink-0 ml-2">
                {TYPE_LABELS[loc.locationType] || loc.locationType}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
