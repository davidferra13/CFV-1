'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { createVendor, updateVendor } from '@/lib/vendors/vendor-actions'
import { VENDOR_CATEGORY_OPTIONS } from '@/lib/vendors/constants'
import type { VendorInput, VendorCategory } from '@/lib/vendors/types'
import { Button } from '@/components/ui/button'
import { Star } from '@/components/ui/icons'
import { useProtectedForm } from '@/lib/qol/use-protected-form'
import { FormShield } from '@/components/forms/form-shield'

type VendorFormProps = {
  vendor?: {
    id: string
    name: string
    category: string
    contact_name: string | null
    phone: string | null
    email: string | null
    website: string | null
    address: string | null
    notes: string | null
    is_preferred: boolean
    rating: number | null
  }
  onSaved: () => void
  onCancel?: () => void
}

export function VendorForm({ vendor, onSaved, onCancel }: VendorFormProps) {
  const isEditing = !!vendor
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(vendor?.name ?? '')
  const [category, setCategory] = useState<VendorCategory>(
    (vendor?.category as VendorCategory) ?? 'grocery'
  )
  const [contactName, setContactName] = useState(vendor?.contact_name ?? '')
  const [phone, setPhone] = useState(vendor?.phone ?? '')
  const [email, setEmail] = useState(vendor?.email ?? '')
  const [website, setWebsite] = useState(vendor?.website ?? '')
  const [address, setAddress] = useState(vendor?.address ?? '')
  const [notes, setNotes] = useState(vendor?.notes ?? '')
  const [isPreferred, setIsPreferred] = useState(vendor?.is_preferred ?? false)
  const [rating, setRating] = useState<number | null>(vendor?.rating ?? null)

  const defaultData = useMemo(
    () => ({
      name: vendor?.name ?? '',
      category: (vendor?.category ?? 'grocery') as VendorCategory,
      contactName: vendor?.contact_name ?? '',
      phone: vendor?.phone ?? '',
      email: vendor?.email ?? '',
      website: vendor?.website ?? '',
      address: vendor?.address ?? '',
      notes: vendor?.notes ?? '',
      isPreferred: vendor?.is_preferred ?? false,
      rating: vendor?.rating ?? (null as number | null),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vendor?.id]
  )

  const currentData = useMemo(
    () => ({
      name,
      category,
      contactName,
      phone,
      email,
      website,
      address,
      notes,
      isPreferred,
      rating,
    }),
    [name, category, contactName, phone, email, website, address, notes, isPreferred, rating]
  )

  const protection = useProtectedForm({
    surfaceId: 'vendor-form',
    recordId: vendor?.id ?? null,
    tenantId: 'local',
    defaultData,
    currentData,
  })

  const applyFormData = useCallback((d: typeof defaultData) => {
    setName(d.name)
    setCategory(d.category)
    setContactName(d.contactName)
    setPhone(d.phone)
    setEmail(d.email)
    setWebsite(d.website)
    setAddress(d.address)
    setNotes(d.notes)
    setIsPreferred(d.isPreferred)
    setRating(d.rating)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const data: VendorInput = {
      name,
      category,
      contact_name: contactName || null,
      phone: phone || null,
      email: email || null,
      website: website || null,
      address: address || null,
      notes: notes || null,
      is_preferred: isPreferred,
      rating,
    }

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateVendor(vendor.id, data)
        } else {
          await createVendor(data)
        }
        protection.markCommitted()
        onSaved()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save vendor')
      }
    })
  }

  return (
    <FormShield
      guard={protection.guard}
      showRestorePrompt={protection.showRestorePrompt}
      lastSavedAt={protection.lastSavedAt}
      onRestore={() => {
        const d = protection.restoreDraft()
        if (d) applyFormData(d)
      }}
      onDiscard={protection.discardDraft}
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <h2 className="text-lg font-semibold">{isEditing ? 'Edit Vendor' : 'Add Vendor'}</h2>

        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            placeholder="e.g. Whole Foods, Local Farm Co."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category *</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as VendorCategory)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          >
            {VENDOR_CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Contact Name</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              placeholder="https://..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-y"
            placeholder="Delivery schedule, minimum orders, special terms..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Rating</label>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(rating === i + 1 ? null : i + 1)}
                className="p-0.5"
              >
                <Star
                  className={`h-5 w-5 ${
                    rating && i < rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
            {rating && <span className="text-sm text-muted-foreground ml-2">{rating}/5</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is-preferred"
            checked={isPreferred}
            onChange={(e) => setIsPreferred(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="is-preferred" className="text-sm">
            Mark as preferred vendor
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Vendor'}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </FormShield>
  )
}
