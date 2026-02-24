// Partner Create/Edit Form
// Captures partner info, contact details, and showcase settings
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import {
  createPartner,
  updatePartner,
  type CreatePartnerInput,
  type UpdatePartnerInput,
} from '@/lib/partners/actions'

type PartnerType = 'airbnb_host' | 'business' | 'platform' | 'individual' | 'venue' | 'other'

const PARTNER_TYPE_OPTIONS: { value: PartnerType; label: string }[] = [
  { value: 'airbnb_host', label: 'Airbnb Host' },
  { value: 'business', label: 'Business (Hotel, B&B, Restaurant)' },
  { value: 'venue', label: 'Venue' },
  { value: 'platform', label: 'Platform (TakeAChef, etc.)' },
  { value: 'individual', label: 'Individual Referrer' },
  { value: 'other', label: 'Other' },
]

type ExistingPartner = {
  id: string
  name: string
  partner_type: string
  status: string
  contact_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  booking_url: string | null
  description: string | null
  is_showcase_visible: boolean
  notes: string | null
  commission_notes: string | null
}

export function PartnerForm({ partner }: { partner?: ExistingPartner }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!partner

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      if (isEdit) {
        const input: UpdatePartnerInput = {
          name: formData.get('name') as string,
          partner_type: formData.get('partner_type') as PartnerType,
          contact_name: (formData.get('contact_name') as string) || null,
          email: (formData.get('email') as string) || null,
          phone: (formData.get('phone') as string) || null,
          website: (formData.get('website') as string) || null,
          booking_url: (formData.get('booking_url') as string) || null,
          description: (formData.get('description') as string) || null,
          is_showcase_visible: formData.get('is_showcase_visible') === 'on',
          notes: (formData.get('notes') as string) || null,
          commission_notes: (formData.get('commission_notes') as string) || null,
        }
        await updatePartner(partner.id, input)
        router.push(`/partners/${partner.id}`)
      } else {
        const input: CreatePartnerInput = {
          name: formData.get('name') as string,
          partner_type: (formData.get('partner_type') as PartnerType) || 'individual',
          contact_name: (formData.get('contact_name') as string) || '',
          email: (formData.get('email') as string) || '',
          phone: (formData.get('phone') as string) || '',
          website: (formData.get('website') as string) || '',
          booking_url: (formData.get('booking_url') as string) || '',
          description: (formData.get('description') as string) || '',
          is_showcase_visible: formData.get('is_showcase_visible') === 'on',
          notes: (formData.get('notes') as string) || '',
          commission_notes: (formData.get('commission_notes') as string) || '',
        }
        const result = await createPartner(input)
        router.push(`/partners/${result.partner.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}

      {/* Basic Info */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-100">Partner Info</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Partner Name <span className="text-red-500">*</span>
            </label>
            <Input
              name="name"
              defaultValue={partner?.name || ''}
              placeholder="e.g., Mountain View Airbnb"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Type</label>
            <Select name="partner_type" defaultValue={partner?.partner_type || 'individual'}>
              {PARTNER_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Description</label>
          <Textarea
            name="description"
            defaultValue={partner?.description || ''}
            placeholder="Public-facing description for the showcase page"
            rows={3}
          />
          <p className="text-xs text-stone-400 mt-1">
            Shown on your public profile if showcase is enabled
          </p>
        </div>
      </Card>

      {/* Contact Info */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-100">Contact Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Contact Person</label>
            <Input
              name="contact_name"
              defaultValue={partner?.contact_name || ''}
              placeholder="Primary contact name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Email</label>
            <Input
              name="email"
              type="email"
              defaultValue={partner?.email || ''}
              placeholder="partner@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Phone</label>
            <Input name="phone" defaultValue={partner?.phone || ''} placeholder="(555) 123-4567" />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Website</label>
            <Input
              name="website"
              defaultValue={partner?.website || ''}
              placeholder="https://example.com"
            />
          </div>
        </div>
      </Card>

      {/* Showcase & Booking */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-100">Showcase & Booking</h2>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Booking URL</label>
          <Input
            name="booking_url"
            defaultValue={partner?.booking_url || ''}
            placeholder="https://airbnb.com/rooms/..."
          />
          <p className="text-xs text-stone-400 mt-1">
            Visitors can click through to book this venue from your public profile
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_showcase_visible"
            name="is_showcase_visible"
            defaultChecked={partner?.is_showcase_visible || false}
            className="h-4 w-4 rounded border-stone-600 text-brand-600 focus:ring-brand-500"
          />
          <label htmlFor="is_showcase_visible" className="text-sm font-medium text-stone-300">
            Show on public profile showcase
          </label>
        </div>
      </Card>

      {/* Internal Notes */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-100">Internal Notes</h2>
        <p className="text-xs text-stone-400">These notes are never shown publicly</p>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">
            Relationship Notes
          </label>
          <Textarea
            name="notes"
            defaultValue={partner?.notes || ''}
            placeholder="How you met, communication style, special arrangements..."
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">
            Commission / Referral Notes
          </label>
          <Textarea
            name="commission_notes"
            defaultValue={partner?.commission_notes || ''}
            placeholder="Any referral fee or commission arrangements..."
            rows={2}
          />
        </div>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? isEdit
              ? 'Saving...'
              : 'Creating...'
            : isEdit
              ? 'Save Changes'
              : 'Create Partner'}
        </Button>
      </div>
    </form>
  )
}
