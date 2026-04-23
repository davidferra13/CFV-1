// Partner Location Create/Edit Form
// Add or edit a location (property/venue) for a referral partner
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { CheckboxGroup } from '@/components/ui/checkbox-group'
import {
  createPartnerLocation,
  updatePartnerLocation,
  type CreateLocationInput,
  type UpdateLocationInput,
} from '@/lib/partners/actions'
import {
  CHEF_LOCATION_RELATIONSHIP_LABELS,
  CHEF_LOCATION_RELATIONSHIP_OPTIONS,
  LOCATION_BEST_FOR_LABELS,
  LOCATION_BEST_FOR_OPTIONS,
  LOCATION_EXPERIENCE_TAG_LABELS,
  LOCATION_EXPERIENCE_TAG_OPTIONS,
  LOCATION_SERVICE_TYPE_LABELS,
  LOCATION_SERVICE_TYPE_OPTIONS,
} from '@/lib/partners/location-experiences'

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
  experience_tags: string[] | null
  best_for: string[] | null
  service_types: string[] | null
  relationship_type: string | null
  is_public: boolean | null
  is_featured: boolean | null
  sort_order: number | null
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
  const [experienceTags, setExperienceTags] = useState<string[]>(
    () =>
      (location?.experience_tags || []).map(
        (value) =>
          LOCATION_EXPERIENCE_TAG_LABELS[
            value as keyof typeof LOCATION_EXPERIENCE_TAG_LABELS
          ] ?? value
      )
  )
  const [bestFor, setBestFor] = useState<string[]>(
    () =>
      (location?.best_for || []).map(
        (value) => LOCATION_BEST_FOR_LABELS[value as keyof typeof LOCATION_BEST_FOR_LABELS] ?? value
      )
  )
  const [serviceTypes, setServiceTypes] = useState<string[]>(
    () =>
      (location?.service_types || []).map(
        (value) =>
          LOCATION_SERVICE_TYPE_LABELS[value as keyof typeof LOCATION_SERVICE_TYPE_LABELS] ?? value
      )
  )
  const [relationshipType, setRelationshipType] = useState(
    location?.relationship_type || 'preferred'
  )
  const [isPublic, setIsPublic] = useState(location?.is_public ?? true)
  const [isFeatured, setIsFeatured] = useState(location?.is_featured ?? true)

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
          experience_tags: experienceTags as any,
          best_for: bestFor as any,
          service_types: serviceTypes as any,
          relationship_type: relationshipType as any,
          is_public: isPublic,
          is_featured: isFeatured,
          sort_order: formData.get('sort_order')
            ? parseInt(formData.get('sort_order') as string, 10)
            : 0,
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
          experience_tags: experienceTags as any,
          best_for: bestFor as any,
          service_types: serviceTypes as any,
          relationship_type: relationshipType as any,
          is_public: isPublic,
          is_featured: isFeatured,
          sort_order: formData.get('sort_order')
            ? parseInt(formData.get('sort_order') as string, 10)
            : 0,
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
        <label className="block text-sm font-medium text-stone-300 mb-1">
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
        <label className="block text-sm font-medium text-stone-300 mb-1">Description</label>
        <Textarea
          name="description"
          defaultValue={location?.description || ''}
          placeholder="Describe what clients can expect here and why this setting converts."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Address</label>
          <Input
            name="address"
            defaultValue={location?.address || ''}
            placeholder="123 Mountain Rd"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">City</label>
          <Input name="city" defaultValue={location?.city || ''} placeholder="Aspen" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">State</label>
          <Input name="state" defaultValue={location?.state || ''} placeholder="CO" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">ZIP</label>
          <Input name="zip" defaultValue={location?.zip || ''} placeholder="81611" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Booking URL</label>
          <Input
            name="booking_url"
            defaultValue={location?.booking_url || ''}
            placeholder="https://airbnb.com/rooms/..."
          />
          <p className="text-xs text-stone-400 mt-1">
            Overrides the partner-level booking link for this location
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Max Guest Count</label>
          <Input
            name="max_guest_count"
            type="number"
            min="1"
            defaultValue={location?.max_guest_count || ''}
            placeholder="Capacity"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Chef Relationship"
          name="relationship_type"
          value={relationshipType}
          onChange={(event) => setRelationshipType(event.target.value)}
          options={CHEF_LOCATION_RELATIONSHIP_OPTIONS.map((value) => ({
            value,
            label: CHEF_LOCATION_RELATIONSHIP_LABELS[value],
          }))}
          helperText="How this setting should be described on the public profile."
        />
        <Input
          label="Public Sort Order"
          name="sort_order"
          type="number"
          min="0"
          defaultValue={location?.sort_order ?? 0}
          placeholder="0"
        />
      </div>

      <CheckboxGroup
        label="Media Tags"
        options={LOCATION_EXPERIENCE_TAG_OPTIONS.map((value) => LOCATION_EXPERIENCE_TAG_LABELS[value])}
        value={experienceTags}
        onValueChange={setExperienceTags}
        helperText="These tags help the gallery read fast on the public profile."
      />

      <CheckboxGroup
        label="Best For"
        options={LOCATION_BEST_FOR_OPTIONS.map((value) => LOCATION_BEST_FOR_LABELS[value])}
        value={bestFor}
        onValueChange={setBestFor}
        helperText="Structured fit tags for faster client understanding."
      />

      <CheckboxGroup
        label="Service Formats"
        options={LOCATION_SERVICE_TYPE_OPTIONS.map((value) => LOCATION_SERVICE_TYPE_LABELS[value])}
        value={serviceTypes}
        onValueChange={setServiceTypes}
        helperText="Formats you can confidently execute in this setting."
      />

      <Card className="border-stone-800 bg-stone-900/70 p-4 space-y-3">
        <p className="text-sm font-semibold text-stone-100">Public Visibility</p>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-stone-800 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-stone-200">Show on public chef profile</p>
            <p className="text-xs text-stone-500">
              Hide settings that should stay internal while keeping the record for attribution.
            </p>
          </div>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(event) => setIsPublic(event.target.checked)}
            className="h-4 w-4 rounded border-stone-600 bg-stone-800"
          />
        </label>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-stone-800 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-stone-200">Feature this setting first</p>
            <p className="text-xs text-stone-500">
              Featured settings rise to the top of the profile experience section.
            </p>
          </div>
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(event) => setIsFeatured(event.target.checked)}
            className="h-4 w-4 rounded border-stone-600 bg-stone-800"
          />
        </label>
      </Card>

      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1">Internal Notes</label>
        <Textarea
          name="notes"
          defaultValue={location?.notes || ''}
          placeholder="Kitchen size, access notes, parking, equipment, load-in, partner intelligence..."
          rows={3}
        />
        <p className="text-xs text-stone-400 mt-1">Not shown publicly</p>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => (onSuccess ? onSuccess() : router.back())}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Save Location' : 'Add Location'}
        </Button>
      </div>
    </form>
  )
}
