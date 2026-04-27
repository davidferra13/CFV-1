'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

interface PartnerProfileFormProps {
  partner: {
    name: string
    description: string | null
    contact_name: string | null
    phone: string | null
    website: string | null
    booking_url: string | null
    cover_image_url: string | null
  }
  saveAction: (formData: FormData) => Promise<void>
}

export function PartnerProfileForm({ partner, saveAction }: PartnerProfileFormProps) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await saveAction(formData)
        toast.success('Profile updated')
      } catch (err) {
        console.error('[partner-profile] Save failed', err)
        toast.error('Failed to save profile')
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">
            Business / Property Name
          </label>
          <input
            name="name"
            defaultValue={partner.name}
            required
            disabled={isPending}
            className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">
            Description (shown publicly)
          </label>
          <textarea
            name="description"
            defaultValue={partner.description ?? ''}
            rows={4}
            disabled={isPending}
            className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none disabled:opacity-50"
            placeholder="Tell guests what makes your space special..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Contact Name</label>
          <input
            name="contact_name"
            defaultValue={partner.contact_name ?? ''}
            disabled={isPending}
            className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Phone</label>
          <input
            name="phone"
            type="tel"
            defaultValue={partner.phone ?? ''}
            disabled={isPending}
            className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Website</label>
          <input
            name="website"
            type="url"
            defaultValue={partner.website ?? ''}
            disabled={isPending}
            placeholder="https://"
            className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">
            Booking URL{' '}
            <span className="font-normal text-stone-400">(Airbnb, VRBO, direct link)</span>
          </label>
          <input
            name="booking_url"
            type="url"
            defaultValue={partner.booking_url ?? ''}
            disabled={isPending}
            placeholder="https://"
            className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Cover Image URL</label>
          <input
            name="cover_image_url"
            type="url"
            defaultValue={partner.cover_image_url ?? ''}
            disabled={isPending}
            placeholder="https://"
            className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:opacity-50"
          />
          <p className="text-xs text-stone-400 mt-1">
            Paste a direct image URL. Your chef can also upload photos for you.
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-stone-900 text-white py-2.5 text-sm font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  )
}
