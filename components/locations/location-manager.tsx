'use client'

import { useState, useTransition, useCallback } from 'react'
import type {
  BusinessLocation,
  LocationInput,
  LocationStats,
} from '@/lib/locations/location-actions'
import {
  createLocation,
  updateLocation,
  deleteLocation,
  getLocations,
  getLocationComparison,
} from '@/lib/locations/location-actions'

// ── Type badge ────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  kitchen: 'bg-blue-900/60 text-blue-300',
  storefront: 'bg-green-900/60 text-green-300',
  truck: 'bg-orange-900/60 text-orange-300',
  commissary: 'bg-purple-900/60 text-purple-300',
  warehouse: 'bg-stone-700 text-stone-300',
  office: 'bg-stone-700 text-stone-400',
}

const TYPE_LABELS: Record<string, string> = {
  kitchen: 'Kitchen',
  storefront: 'Storefront',
  truck: 'Truck',
  commissary: 'Commissary',
  warehouse: 'Warehouse',
  office: 'Office',
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs ${TYPE_COLORS[type] || 'bg-stone-700 text-stone-400'}`}
    >
      {TYPE_LABELS[type] || type}
    </span>
  )
}

// ── Add Form ──────────────────────────────────────────────────────

function AddLocationForm({ onAdded }: { onAdded: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const data: LocationInput = {
      name: fd.get('name') as string,
      address: (fd.get('address') as string) || null,
      locationType: fd.get('locationType') as LocationInput['locationType'],
      isPrimary: fd.get('isPrimary') === 'on',
      timezone: (fd.get('timezone') as string) || null,
      notes: (fd.get('notes') as string) || null,
    }

    startTransition(async () => {
      try {
        const result = await createLocation(data)
        if (!result.success) {
          setError(result.error || 'Failed to add location')
          return
        }
        setShowForm(false)
        onAdded()
      } catch (err: any) {
        setError(err.message || 'Failed to add location')
      }
    })
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
      >
        + Add Location
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-stone-800 border border-stone-700 rounded-lg p-4 space-y-3"
    >
      <h3 className="text-sm font-semibold text-stone-200">Add New Location</h3>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          name="name"
          required
          placeholder="Location name"
          className="bg-stone-900 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200 placeholder-stone-500"
        />
        <select
          name="locationType"
          required
          className="bg-stone-900 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200"
        >
          <option value="kitchen">Kitchen</option>
          <option value="storefront">Storefront</option>
          <option value="truck">Truck</option>
          <option value="commissary">Commissary</option>
          <option value="warehouse">Warehouse</option>
          <option value="office">Office</option>
        </select>
        <input
          name="address"
          placeholder="Address (optional)"
          className="sm:col-span-2 bg-stone-900 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200 placeholder-stone-500"
        />
        <input
          name="timezone"
          placeholder="Timezone (e.g. America/New_York)"
          className="bg-stone-900 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200 placeholder-stone-500"
        />
        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input name="isPrimary" type="checkbox" className="accent-amber-500" />
          Set as primary location
        </label>
        <textarea
          name="notes"
          placeholder="Notes (optional)"
          rows={2}
          className="sm:col-span-2 bg-stone-900 border border-stone-600 rounded px-3 py-2 text-sm text-stone-200 placeholder-stone-500 resize-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors"
        >
          {isPending ? 'Adding...' : 'Add Location'}
        </button>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Main Component ────────────────────────────────────────────────

interface LocationManagerProps {
  initialLocations: BusinessLocation[]
  initialStats: LocationStats[]
}

export function LocationManager({ initialLocations, initialStats }: LocationManagerProps) {
  const [locations, setLocations] = useState(initialLocations)
  const [stats, setStats] = useState(initialStats)
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const [newLocs, newStats] = await Promise.all([getLocations(), getLocationComparison()])
        setLocations(newLocs)
        setStats(newStats)
      } catch {
        // Non-critical
      }
    })
  }, [])

  function handleDeactivate(id: string) {
    startTransition(async () => {
      try {
        const result = await deleteLocation(id)
        if (result.success) refresh()
      } catch {
        // Non-critical
      }
    })
  }

  function handleSetPrimary(id: string) {
    startTransition(async () => {
      try {
        const result = await updateLocation(id, { isPrimary: true })
        if (result.success) refresh()
      } catch {
        // Non-critical
      }
    })
  }

  function handleReactivate(id: string) {
    startTransition(async () => {
      try {
        const result = await updateLocation(id, { isActive: true })
        if (result.success) refresh()
      } catch {
        // Non-critical
      }
    })
  }

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`

  const activeLocations = locations.filter((l) => l.isActive)
  const inactiveLocations = locations.filter((l) => !l.isActive)

  return (
    <div className="space-y-6">
      <AddLocationForm onAdded={refresh} />

      {isPending && <p className="text-xs text-stone-500">Updating...</p>}

      {/* Active locations */}
      {activeLocations.length === 0 ? (
        <div className="bg-stone-800 border border-stone-700 rounded-lg p-8 text-center">
          <p className="text-stone-500">No locations yet. Add your first location above.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {activeLocations.map((loc) => {
            const locStats = stats.find((s) => s.locationId === loc.id)
            return (
              <div key={loc.id} className="bg-stone-800 border border-stone-700 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-stone-100">{loc.name}</h3>
                      <TypeBadge type={loc.locationType} />
                      {loc.isPrimary && (
                        <span className="px-2 py-0.5 rounded text-xs bg-amber-900/40 text-amber-400 font-medium">
                          Primary
                        </span>
                      )}
                    </div>
                    {loc.address && <p className="text-sm text-stone-400 mt-1">{loc.address}</p>}
                    {loc.timezone && (
                      <p className="text-xs text-stone-500 mt-1">Timezone: {loc.timezone}</p>
                    )}
                    {loc.notes && <p className="text-xs text-stone-500 mt-1">{loc.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!loc.isPrimary && (
                      <button
                        onClick={() => handleSetPrimary(loc.id)}
                        disabled={isPending}
                        className="px-2 py-1 bg-amber-800 hover:bg-amber-700 disabled:opacity-50 text-amber-200 rounded text-xs transition-colors"
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      onClick={() => handleDeactivate(loc.id)}
                      disabled={isPending}
                      className="px-2 py-1 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-red-200 rounded text-xs transition-colors"
                    >
                      Deactivate
                    </button>
                  </div>
                </div>

                {/* Stats row */}
                {locStats && (
                  <div className="flex gap-6 mt-3 pt-3 border-t border-stone-700">
                    <div>
                      <p className="text-xs text-stone-500">Staff</p>
                      <p className="text-sm font-medium text-stone-300">{locStats.staffCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500">Inventory Value</p>
                      <p className="text-sm font-medium text-stone-300">
                        {formatCents(locStats.inventoryValueCents)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500">Sales (30d)</p>
                      <p className="text-sm font-medium text-stone-300">
                        {locStats.recentSalesCount}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Inactive locations */}
      {inactiveLocations.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-stone-500 mb-2">Inactive Locations</h3>
          <div className="space-y-2">
            {inactiveLocations.map((loc) => (
              <div
                key={loc.id}
                className="bg-stone-900 border border-stone-700 rounded-lg p-3 flex items-center justify-between opacity-60"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-400">{loc.name}</span>
                  <TypeBadge type={loc.locationType} />
                </div>
                <button
                  onClick={() => handleReactivate(loc.id)}
                  disabled={isPending}
                  className="px-2 py-1 bg-stone-700 hover:bg-stone-600 disabled:opacity-50 text-stone-300 rounded text-xs transition-colors"
                >
                  Reactivate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
