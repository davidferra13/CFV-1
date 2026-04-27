'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import {
  LOCATION_BEST_FOR_LABELS,
  LOCATION_BEST_FOR_OPTIONS,
  LOCATION_EXPERIENCE_TAG_LABELS,
  LOCATION_EXPERIENCE_TAG_OPTIONS,
  LOCATION_SERVICE_TYPE_LABELS,
  LOCATION_SERVICE_TYPE_OPTIONS,
} from '@/lib/partners/location-experiences'

interface PartnerLocationChangeFormProps {
  proposalValues: {
    name: string
    booking_url: string | null
    description: string | null
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
    max_guest_count: number | null
    experience_tags: string[] | null
    best_for: string[] | null
    service_types: string[] | null
  }
  pendingRequest: {
    partner_note: string | null
  } | null
  hasPendingRequest: boolean
  submitAction: (formData: FormData) => Promise<void>
}

export function PartnerLocationChangeForm({
  proposalValues,
  pendingRequest,
  hasPendingRequest,
  submitAction,
}: PartnerLocationChangeFormProps) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await submitAction(formData)
        toast.success('Change request submitted for review')
      } catch (err) {
        console.error('[partner-location] Submit failed', err)
        toast.error('Failed to submit change request')
      }
    })
  }

  return (
    <form action={handleSubmit} className="mt-5 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-300">Location Name</label>
          <input
            name="name"
            defaultValue={proposalValues.name}
            required
            disabled={isPending}
            className="w-full rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-sm text-stone-100 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-300">Booking URL</label>
          <input
            name="booking_url"
            type="url"
            defaultValue={proposalValues.booking_url ?? ''}
            disabled={isPending}
            className="w-full rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-sm text-stone-100 disabled:opacity-50"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-300">Description</label>
        <textarea
          name="description"
          rows={4}
          defaultValue={proposalValues.description ?? ''}
          disabled={isPending}
          className="w-full rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-sm text-stone-100 disabled:opacity-50"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-stone-300">Address</label>
          <input
            name="address"
            defaultValue={proposalValues.address ?? ''}
            disabled={isPending}
            className="w-full rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-sm text-stone-100 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-300">City</label>
          <input
            name="city"
            defaultValue={proposalValues.city ?? ''}
            disabled={isPending}
            className="w-full rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-sm text-stone-100 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-300">State</label>
          <input
            name="state"
            defaultValue={proposalValues.state ?? ''}
            disabled={isPending}
            className="w-full rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-sm text-stone-100 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-300">ZIP</label>
          <input
            name="zip"
            defaultValue={proposalValues.zip ?? ''}
            disabled={isPending}
            className="w-full rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-sm text-stone-100 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-300">
            Max Guest Count
          </label>
          <input
            name="max_guest_count"
            type="number"
            min="1"
            defaultValue={proposalValues.max_guest_count ?? ''}
            disabled={isPending}
            className="w-full rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-sm text-stone-100 disabled:opacity-50"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <p className="mb-2 text-sm font-medium text-stone-300">Media Tags</p>
          <div className="space-y-2">
            {LOCATION_EXPERIENCE_TAG_OPTIONS.map((value) => (
              <label key={value} className="flex items-center gap-2 text-sm text-stone-300">
                <input
                  type="checkbox"
                  name="experience_tags"
                  value={value}
                  defaultChecked={(proposalValues.experience_tags ?? []).includes(value)}
                  disabled={isPending}
                  className="h-4 w-4 rounded border-stone-600 bg-stone-950"
                />
                {LOCATION_EXPERIENCE_TAG_LABELS[value]}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-stone-300">Best For</p>
          <div className="space-y-2">
            {LOCATION_BEST_FOR_OPTIONS.map((value) => (
              <label key={value} className="flex items-center gap-2 text-sm text-stone-300">
                <input
                  type="checkbox"
                  name="best_for"
                  value={value}
                  defaultChecked={(proposalValues.best_for ?? []).includes(value)}
                  disabled={isPending}
                  className="h-4 w-4 rounded border-stone-600 bg-stone-950"
                />
                {LOCATION_BEST_FOR_LABELS[value]}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-stone-300">Service Formats</p>
          <div className="space-y-2">
            {LOCATION_SERVICE_TYPE_OPTIONS.map((value) => (
              <label key={value} className="flex items-center gap-2 text-sm text-stone-300">
                <input
                  type="checkbox"
                  name="service_types"
                  value={value}
                  defaultChecked={(proposalValues.service_types ?? []).includes(value)}
                  disabled={isPending}
                  className="h-4 w-4 rounded border-stone-600 bg-stone-950"
                />
                {LOCATION_SERVICE_TYPE_LABELS[value]}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-300">
          Note for your chef
        </label>
        <textarea
          name="partner_note"
          rows={3}
          defaultValue={pendingRequest?.partner_note ?? ''}
          disabled={isPending}
          placeholder="Explain what changed and why this improves the public setting page."
          className="w-full rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-sm text-stone-100 disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={hasPendingRequest || isPending}
        className="rounded-lg bg-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Submitting...' : hasPendingRequest ? 'Pending Review' : 'Submit For Approval'}
      </button>
    </form>
  )
}
