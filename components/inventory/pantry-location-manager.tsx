'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  createPantryLocation,
  deletePantryLocation,
  type PantryLocation,
  type PantryLocationType,
} from '@/lib/inventory/pantry-actions'

type Props = {
  locations: PantryLocation[]
  onUpdate: () => void
}

const LOCATION_TYPES: { value: PantryLocationType; label: string }[] = [
  { value: 'home', label: 'Home Kitchen' },
  { value: 'client', label: 'Client Home' },
  { value: 'storage', label: 'Storage Unit' },
  { value: 'other', label: 'Other' },
]

export function PantryLocationManager({ locations, onUpdate }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [locationType, setLocationType] = useState<PantryLocationType>('home')
  const [clientId, setClientId] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  function handleCreate() {
    if (!name.trim()) {
      toast.error('Location name is required')
      return
    }

    startTransition(async () => {
      try {
        await createPantryLocation({
          name: name.trim(),
          locationType,
          clientId: clientId.trim() || null,
          isDefault,
        })
        setName('')
        setLocationType('home')
        setClientId('')
        setIsDefault(false)
        setShowForm(false)
        toast.success('Location created')
        onUpdate()
      } catch (err) {
        toast.error('Failed to create location')
        console.error('[pantry-location-manager] create error:', err)
      }
    })
  }

  function handleDelete(id: string, locationName: string) {
    if (!confirm(`Delete "${locationName}" and all its items?`)) return

    startTransition(async () => {
      try {
        await deletePantryLocation(id)
        toast.success('Location deleted')
        onUpdate()
      } catch (err) {
        toast.error('Failed to delete location')
        console.error('[pantry-location-manager] delete error:', err)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">Pantry Locations</h3>
        <Button variant="primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Location'}
        </Button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <Input
            placeholder="Location name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex gap-3 items-center flex-wrap">
            <select
              value={locationType}
              onChange={(e) => setLocationType(e.target.value as PantryLocationType)}
              className="border rounded-md px-3 py-2 text-sm bg-white"
            >
              {LOCATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {locationType === 'client' && (
              <Input
                placeholder="Client ID (optional)"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="max-w-xs"
              />
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              Set as default
            </label>
          </div>
          <Button variant="primary" onClick={handleCreate} disabled={isPending}>
            Save Location
          </Button>
        </div>
      )}

      {locations.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No locations yet.</p>
      ) : (
        <div className="space-y-2">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="flex items-center justify-between border rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{loc.name}</span>
                <Badge variant="default" className="text-xs">
                  {LOCATION_TYPES.find((t) => t.value === loc.locationType)?.label ||
                    loc.locationType}
                </Badge>
                {loc.isDefault && (
                  <Badge variant="info" className="text-xs">
                    Default
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                className="text-red-600 text-xs"
                onClick={() => handleDelete(loc.id, loc.name)}
                disabled={isPending}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
