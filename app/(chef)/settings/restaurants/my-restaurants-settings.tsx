'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateRestaurantGroupName } from '@/lib/chef/profile-actions'
import { createRestaurant, deleteRestaurant } from '@/lib/restaurants/actions'
import { MapPin, Plus, Trash2, Store, Globe, Users } from 'lucide-react'
import { toast } from 'sonner'

type Restaurant = {
  id: string
  partner_id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  description: string | null
  booking_url: string | null
  max_guest_count: number | null
  cover_image_url: string | null
  is_public: boolean
  is_featured: boolean
}

type Props = {
  restaurantGroupName: string | null
  restaurants: Restaurant[]
}

export function MyRestaurantsSettings({ restaurantGroupName, restaurants }: Props) {
  const router = useRouter()
  const [groupName, setGroupName] = useState(restaurantGroupName ?? '')
  const [showAddForm, setShowAddForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Add form state
  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newCity, setNewCity] = useState('')
  const [newState, setNewState] = useState('')
  const [newZip, setNewZip] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newBookingUrl, setNewBookingUrl] = useState('')
  const [newMaxGuests, setNewMaxGuests] = useState('')

  function handleSaveGroupName() {
    startTransition(async () => {
      try {
        await updateRestaurantGroupName(groupName.trim() || null)
        toast.success('Restaurant group name updated')
        router.refresh()
      } catch {
        toast.error('Failed to update group name')
      }
    })
  }

  function handleAddRestaurant() {
    if (!newName.trim()) {
      toast.error('Restaurant name is required')
      return
    }

    startTransition(async () => {
      try {
        await createRestaurant({
          name: newName.trim(),
          address: newAddress.trim() || undefined,
          city: newCity.trim() || undefined,
          state: newState.trim() || undefined,
          zip: newZip.trim() || undefined,
          description: newDescription.trim() || undefined,
          booking_url: newBookingUrl.trim() || undefined,
          max_guest_count: newMaxGuests ? parseInt(newMaxGuests, 10) : null,
        })
        toast.success(`${newName.trim()} added`)
        setNewName('')
        setNewAddress('')
        setNewCity('')
        setNewState('')
        setNewZip('')
        setNewDescription('')
        setNewBookingUrl('')
        setNewMaxGuests('')
        setShowAddForm(false)
        router.refresh()
      } catch {
        toast.error('Failed to add restaurant')
      }
    })
  }

  function handleDelete(locationId: string, name: string) {
    if (!confirm(`Remove "${name}" from your restaurants?`)) return

    startTransition(async () => {
      try {
        await deleteRestaurant(locationId)
        toast.success(`${name} removed`)
        router.refresh()
      } catch {
        toast.error('Failed to remove restaurant')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Restaurant Group Name */}
      <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-6">
        <h2 className="text-lg font-semibold text-stone-100 mb-1">Restaurant Group</h2>
        <p className="text-sm text-stone-400 mb-4">
          Optional. If you operate multiple restaurants under a group name, it will appear as the
          section heading on your public profile.
        </p>
        <div className="flex gap-3">
          <Input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Harbor Restaurant Group"
            className="max-w-md"
          />
          <Button
            onClick={handleSaveGroupName}
            disabled={isPending || groupName === (restaurantGroupName ?? '')}
            variant="secondary"
          >
            Save
          </Button>
        </div>
      </div>

      {/* Restaurant List */}
      <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Your Restaurants</h2>
            <p className="text-sm text-stone-400">
              {restaurants.length === 0
                ? 'Add restaurants to showcase on your public profile.'
                : `${restaurants.length} restaurant${restaurants.length !== 1 ? 's' : ''} on your profile.`}
            </p>
          </div>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} variant="primary">
              <Plus className="h-4 w-4 mr-1" />
              Add Restaurant
            </Button>
          )}
        </div>

        {/* Existing Restaurants */}
        {restaurants.length > 0 && (
          <div className="space-y-3 mb-4">
            {restaurants.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-stone-600 bg-stone-900/50 p-4"
              >
                <div className="flex items-start gap-3">
                  <Store className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-medium text-stone-100">{r.name}</h3>
                    {(r.city || r.state) && (
                      <p className="text-sm text-stone-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {[r.city, r.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {r.description && (
                      <p className="text-sm text-stone-500 mt-1 line-clamp-2">{r.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      {r.booking_url && (
                        <span className="text-xs text-stone-500 flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          Booking link set
                        </span>
                      )}
                      {r.max_guest_count && (
                        <span className="text-xs text-stone-500 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Up to {r.max_guest_count} guests
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => handleDelete(r.id, r.name)}
                  disabled={isPending}
                  className="text-stone-400 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add Restaurant Form */}
        {showAddForm && (
          <div className="rounded-lg border border-amber-700/50 bg-stone-900/80 p-5 space-y-4">
            <h3 className="font-medium text-stone-100">Add Restaurant</h3>

            <div>
              <label className="block text-sm text-stone-300 mb-1">
                Restaurant Name <span className="text-red-400">*</span>
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. The Harbor Kitchen"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-stone-300 mb-1">Description</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Tell clients about your restaurant..."
                className="w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-stone-100 placeholder:text-stone-500 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-stone-300 mb-1">Street Address</label>
                <Input
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="123 Main St"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-300 mb-1">City</label>
                <Input
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="Boston"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-300 mb-1">State</label>
                <Input
                  value={newState}
                  onChange={(e) => setNewState(e.target.value)}
                  placeholder="MA"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-300 mb-1">ZIP</label>
                <Input
                  value={newZip}
                  onChange={(e) => setNewZip(e.target.value)}
                  placeholder="02101"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-stone-300 mb-1">Booking / Website URL</label>
                <Input
                  value={newBookingUrl}
                  onChange={(e) => setNewBookingUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm text-stone-300 mb-1">Max Guests</label>
                <Input
                  type="number"
                  value={newMaxGuests}
                  onChange={(e) => setNewMaxGuests(e.target.value)}
                  placeholder="e.g. 80"
                  min={1}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleAddRestaurant}
                disabled={isPending || !newName.trim()}
                variant="primary"
              >
                {isPending ? 'Adding...' : 'Add Restaurant'}
              </Button>
              <Button variant="ghost" onClick={() => setShowAddForm(false)} disabled={isPending}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Empty state hint */}
        {restaurants.length === 0 && !showAddForm && (
          <div className="text-center py-8 text-stone-500">
            <Store className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No restaurants added yet.</p>
            <p className="text-sm mt-1">
              Add your restaurant to showcase it on your public profile.
            </p>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="rounded-lg border border-stone-700 bg-stone-800/30 p-4">
        <p className="text-sm text-stone-400">
          Restaurants appear in a dedicated section on your public chef profile. Add photos and
          additional details through the{' '}
          <a href="/partners" className="text-amber-400 hover:text-amber-300 underline">
            Partners
          </a>{' '}
          page after creating a restaurant here.
        </p>
      </div>
    </div>
  )
}
