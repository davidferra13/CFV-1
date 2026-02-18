// Partner Location Create/Edit Form
// Add or edit a location (property/venue) for a referral partner
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import {
  createPartnerLocation,
  updatePartnerLocation,
  type CreateLocationInput,
  type UpdateLocationInput,
} from '@/lib/partners/actions'

type ExistingLocation = {
  id: string
  partner_id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  booking_url: string | null
  description: string | null
  notes: string | null
  max_guest_count: number | null
}

export function LocationForm({
  partnerId,
  location,
  onSuccess,
}: {
  partnerId: string
  location?: ExistingLocation
  onSuccess?: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!location

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      if (isEdit) {
        const input: UpdateLocationInput = {
          name: formData.get('name') as string,
          address: (formData.get('address') as string) || null,
          city: (formData.get('city') as string) || null,
          state: (formData.get('state') as string) || null,
          zip: (formData.get('zip') as string) || null,
          booking_url: (formData.get('booking_url') as string) || null,
          description: (formData.get('description') as string) || null,
          notes: (formData.get('notes') as string) || null,
          max_guest_count: formData.get('max_guest_count')
            ? parseInt(formData.get('max_guest_count') as string, 10)
            : null,
        }
        await updatePartnerLocation(location.id, input)
      } else {
        const input: CreateLocationInput = {
          partner_id: partnerId,
          name: formData.get('name') as string,
          address: (formData.get('address') as string) || '',
          city: (formData.get('city') as string) || '',
          state: (formData.get('state') as string) || '',
          zip: (formData.get('zip') as string) || '',
          booking_url: (formData.get('booking_url') as string) || '',
          description: (formData.get('description') as string) || '',
          notes: (formData.get('notes') as string) || '',
          max_guest_count: formData.get('max_guest_count')
            ? parseInt(formData.get('max_guest_count') as string, 10)
            : null,
        }
        await createPartnerLocation(input)
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/partners/${partnerId}`)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Location Name <span className="text-red-500">*</span>
        </label>
        <Input
          name="name"
          defaultValue={location?.name || ''}
          placeholder="e.g., Mountain View Cabin"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
        <Textarea
          name="description"
          defaultValue={location?.description || ''}
          placeholder="Public-facing description of this location"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Address</label>
          <Input name="address" defaultValue={location?.address || ''} placeholder="123 Mountain Rd" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">City</label>
          <Input name="city" defaultValue={location?.city || ''} placeholder="Aspen" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">State</label>
          <Input name="state" defaultValue={location?.state || ''} placeholder="CO" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">ZIP</label>
          <Input name="zip" defaultValue={location?.zip || ''} placeholder="81611" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Booking URL</label>
          <Input
            name="booking_url"
            defaultValue={location?.booking_url || ''}
            placeholder="https://airbnb.com/rooms/..."
          />
          <p className="text-xs text-stone-400 mt-1">Overrides the partner-level booking link for this location</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Max Guest Count</label>
          <Input
            name="max_guest_count"
            type="number"
            min="1"
            defaultValue={location?.max_guest_count || ''}
            placeholder="Capacity"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Internal Notes</label>
        <Textarea
          name="notes"
          defaultValue={location?.notes || ''}
          placeholder="Kitchen size, access notes, parking, equipment..."
          rows={2}
        />
        <p className="text-xs text-stone-400 mt-1">Not shown publicly</p>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => onSuccess ? onSuccess() : router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : (isEdit ? 'Save Location' : 'Add Location')}
        </Button>
      </div>
    </form>
  )
}
