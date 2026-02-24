'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  createStorageLocation,
  deleteStorageLocation,
  setDefaultLocation,
} from '@/lib/inventory/location-actions'

const LOCATION_TYPES = [
  { value: 'home_fridge', label: 'Home Fridge' },
  { value: 'home_freezer', label: 'Home Freezer' },
  { value: 'home_pantry', label: 'Home Pantry' },
  { value: 'home_dry_storage', label: 'Dry Storage' },
  { value: 'walk_in_cooler', label: 'Walk-in Cooler' },
  { value: 'walk_in_freezer', label: 'Walk-in Freezer' },
  { value: 'commercial_kitchen', label: 'Commercial Kitchen' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'event_site', label: 'Event Site' },
  { value: 'other', label: 'Other' },
]

const TEMP_ZONES = [
  { value: '', label: 'Not specified' },
  { value: 'ambient', label: 'Ambient' },
  { value: 'refrigerated', label: 'Refrigerated' },
  { value: 'frozen', label: 'Frozen' },
]

type Props = {
  initialLocations: any[]
  initialStock: any[]
}

export function LocationsClient({ initialLocations, initialStock }: Props) {
  const [locations, setLocations] = useState(initialLocations)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [name, setName] = useState('')
  const [locType, setLocType] = useState('home_pantry')
  const [tempZone, setTempZone] = useState('')
  const [notes, setNotes] = useState('')

  function getStockCount(locationId: string) {
    return initialStock.filter((s: any) => s.locationId === locationId).length
  }

  function handleCreate() {
    if (!name.trim()) return
    startTransition(async () => {
      try {
        await createStorageLocation({
          name: name.trim(),
          locationType: locType as any,
          temperatureZone: tempZone || undefined,
          notes: notes.trim() || undefined,
        })
        setShowForm(false)
        setName('')
        setNotes('')
        // Reload to get updated list
        window.location.reload()
      } catch (err) {
        console.error('Failed to create location', err)
      }
    })
  }

  function handleSetDefault(id: string) {
    startTransition(async () => {
      try {
        await setDefaultLocation(id)
        window.location.reload()
      } catch (err) {
        console.error('Failed to set default', err)
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Deactivate this storage location?')) return
    startTransition(async () => {
      try {
        await deleteStorageLocation(id)
        window.location.reload()
      } catch (err) {
        console.error('Failed to delete location', err)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-stone-500">
          {locations.length} location{locations.length !== 1 ? 's' : ''}
        </span>
        <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Location'}
        </Button>
      </div>

      {showForm && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-stone-100">New Storage Location</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Location name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200"
            />
            <select
              value={locType}
              onChange={(e) => setLocType(e.target.value)}
              className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200"
            >
              {LOCATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              value={tempZone}
              onChange={(e) => setTempZone(e.target.value)}
              className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200"
            >
              {TEMP_ZONES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200"
            />
          </div>
          <Button variant="primary" size="sm" onClick={handleCreate} loading={isPending}>
            Create Location
          </Button>
        </Card>
      )}

      {/* Location cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {locations.length === 0 ? (
          <Card className="p-6 col-span-full text-center">
            <p className="text-stone-500 text-sm">
              No storage locations yet. Add your first location to start tracking inventory by
              location.
            </p>
          </Card>
        ) : (
          locations.map((loc: any) => (
            <Card key={loc.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-stone-100">{loc.name}</h3>
                  <p className="text-sm text-stone-400 mt-0.5">
                    {LOCATION_TYPES.find((t) => t.value === loc.locationType)?.label ??
                      loc.locationType}
                    {loc.temperatureZone && ` \u00B7 ${loc.temperatureZone}`}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {loc.isDefault && <Badge variant="success">Default</Badge>}
                  <Badge variant="info">{getStockCount(loc.id)} items</Badge>
                </div>
              </div>
              {loc.notes && <p className="text-xs text-stone-500 mt-2">{loc.notes}</p>}
              <div className="flex gap-2 mt-3">
                {!loc.isDefault && (
                  <Button variant="ghost" size="sm" onClick={() => handleSetDefault(loc.id)}>
                    Set Default
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => handleDelete(loc.id)}>
                  Remove
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
