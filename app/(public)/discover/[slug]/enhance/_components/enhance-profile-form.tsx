'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { enhanceDirectoryListing } from '@/lib/discover/actions'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

type Props = {
  listingId: string
  slug: string
  currentDescription: string
  currentAddress: string
  currentPhone: string
  currentMenuUrl: string
}

export function EnhanceProfileForm({
  listingId,
  slug,
  currentDescription,
  currentAddress,
  currentPhone,
  currentMenuUrl,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [description, setDescription] = useState(currentDescription)
  const [address, setAddress] = useState(currentAddress)
  const [phone, setPhone] = useState(currentPhone)
  const [menuUrl, setMenuUrl] = useState(currentMenuUrl)
  const [hours, setHours] = useState<Record<string, string>>(
    Object.fromEntries(DAYS.map((d) => [d, '']))
  )

  function updateHours(day: string, value: string) {
    setHours((prev) => ({ ...prev, [day]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Filter out empty hours
    const filteredHours = Object.fromEntries(
      Object.entries(hours).filter(([, v]) => v.trim() !== '')
    )

    startTransition(async () => {
      try {
        const result = await enhanceDirectoryListing({
          listingId,
          description: description.trim(),
          address: address.trim(),
          phone: phone.trim(),
          menuUrl: menuUrl.trim(),
          hours: Object.keys(filteredHours).length > 0 ? filteredHours : undefined,
        })

        if (result.success) {
          toast.success('Profile updated! Your changes are live.')
          router.push(`/discover/${slug}`)
        } else {
          toast.error(result.error || 'Failed to save changes.')
        }
      } catch {
        toast.error('Something went wrong.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-stone-200 mb-1.5">
          About your business
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Tell visitors what makes your business special..."
          className="w-full rounded-lg border border-stone-700 bg-stone-900/80 px-4 py-3 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
        />
        <p className="mt-1 text-xs-tight text-stone-500">{description.length}/1000</p>
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-stone-200 mb-1.5">Street address</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main St, Suite 4"
          className="h-11 w-full rounded-lg border border-stone-700 bg-stone-900/80 px-4 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
      </div>

      {/* Phone & Menu URL */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-stone-200 mb-1.5">Phone number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="h-11 w-full rounded-lg border border-stone-700 bg-stone-900/80 px-4 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-200 mb-1.5">Menu URL</label>
          <input
            type="url"
            value={menuUrl}
            onChange={(e) => setMenuUrl(e.target.value)}
            placeholder="https://yourbusiness.com/menu"
            className="h-11 w-full rounded-lg border border-stone-700 bg-stone-900/80 px-4 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
      </div>

      {/* Hours */}
      <div>
        <label className="block text-sm font-medium text-stone-200 mb-2">Business hours</label>
        <div className="space-y-2">
          {DAYS.map((day) => (
            <div key={day} className="flex items-center gap-3">
              <span className="w-24 text-xs text-stone-400">{day}</span>
              <input
                type="text"
                value={hours[day]}
                onChange={(e) => updateHours(day, e.target.value)}
                placeholder="9:00 AM - 9:00 PM or Closed"
                className="h-9 flex-1 rounded-lg border border-stone-700 bg-stone-900/80 px-3 text-xs text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save profile'}
        </button>
        <p className="text-xs-tight text-stone-500">Changes appear immediately on your listing.</p>
      </div>
    </form>
  )
}
