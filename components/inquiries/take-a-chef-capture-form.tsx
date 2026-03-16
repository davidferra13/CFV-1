'use client'

// Take a Chef Manual Capture Form
// Structured form for logging a TakeaChef booking manually - no AI required.
// Fast for chefs who have the details in front of them and just want to get it in.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import {
  captureTakeAChefBooking,
  type TakeAChefCaptureInput,
} from '@/lib/inquiries/take-a-chef-capture-actions'
import { getDefaultTakeAChefCommissionPercent } from '@/lib/integrations/take-a-chef-defaults'

// ─── Component ────────────────────────────────────────────────────────────

export function TakeAChefCaptureForm({
  onSuccess,
  defaultCommissionPercent = getDefaultTakeAChefCommissionPercent(),
}: {
  onSuccess?: (result: { inquiryId?: string; eventId?: string }) => void
  defaultCommissionPercent?: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [result, setResult] = useState<{ inquiryId?: string; eventId?: string } | null>(null)

  const [form, setForm] = useState<Partial<TakeAChefCaptureInput>>({
    commission_percent: defaultCommissionPercent,
    log_commission: true,
    guest_count: 4,
    serve_time: '19:00',
    occasion: 'Private Dining',
  })

  const set = (field: keyof TakeAChefCaptureInput, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.full_name?.trim()) {
      setError('Client name is required')
      return
    }
    if (!form.event_date) {
      setError('Event date is required')
      return
    }
    if (!form.serve_time) {
      setError('Serve time is required')
      return
    }
    if (!form.guest_count || form.guest_count < 1) {
      setError('Valid guest count required')
      return
    }
    if (!form.location?.trim()) {
      setError('Location is required')
      return
    }
    if (!form.occasion?.trim()) {
      setError('Occasion is required')
      return
    }

    setLoading(true)

    try {
      const res = await captureTakeAChefBooking({
        full_name: form.full_name!.trim(),
        email: form.email || '',
        phone: form.phone || '',
        event_date: form.event_date!,
        serve_time: form.serve_time!,
        guest_count: form.guest_count!,
        location: form.location!.trim(),
        occasion: form.occasion!.trim(),
        total_price_cents: form.total_price_cents ?? null,
        commission_percent: form.commission_percent ?? defaultCommissionPercent,
        log_commission: form.log_commission ?? true,
        dietary_restrictions: form.dietary_restrictions || '',
        additional_notes: form.additional_notes || '',
      })

      if (!res.success) {
        setError(res.error || 'Capture failed')
        return
      }

      setResult({ inquiryId: res.inquiryId, eventId: res.eventId })
      setDone(true)
      onSuccess?.({ inquiryId: res.inquiryId, eventId: res.eventId })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (done && result) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-950 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-xl">✓</span>
          <div>
            <p className="font-semibold text-green-900">Booking Captured</p>
            <p className="text-sm text-green-700 mt-0.5">
              Client, inquiry, and draft event created - all tagged as Take a Chef
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {result.inquiryId && (
            <Button size="sm" onClick={() => router.push(`/inquiries/${result.inquiryId}`)}>
              View Inquiry
            </Button>
          )}
          {result.eventId && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => router.push(`/events/${result.eventId}`)}
            >
              View Event
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDone(false)
              setForm({
                commission_percent: defaultCommissionPercent,
                log_commission: true,
                guest_count: 4,
                serve_time: '19:00',
                occasion: 'Private Dining',
              })
              setResult(null)
            }}
          >
            Add Another
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Client Info */}
      <div>
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-3">
          Client
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Sarah Mitchell"
              value={form.full_name || ''}
              onChange={(e) => set('full_name', e.target.value)}
              className="w-full px-3 py-2 border border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Email</label>
            <input
              type="email"
              placeholder="sarah@example.com"
              value={form.email || ''}
              onChange={(e) => set('email', e.target.value)}
              className="w-full px-3 py-2 border border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Phone</label>
            <input
              type="tel"
              placeholder="(555) 123-4567"
              value={form.phone || ''}
              onChange={(e) => set('phone', e.target.value)}
              className="w-full px-3 py-2 border border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Event Details */}
      <div>
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-3">
          Event Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.event_date || ''}
              onChange={(e) => set('event_date', e.target.value)}
              className="w-full px-3 py-2 border border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Serve Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={form.serve_time || '19:00'}
              onChange={(e) => set('serve_time', e.target.value)}
              className="w-full px-3 py-2 border border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Guests <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              max={200}
              placeholder="6"
              value={form.guest_count || ''}
              onChange={(e) => set('guest_count', Number(e.target.value))}
              className="w-full px-3 py-2 border border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Occasion <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Birthday dinner"
              value={form.occasion || ''}
              onChange={(e) => set('occasion', e.target.value)}
              className="w-full px-3 py-2 border border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="45 Oceanview Drive, Malibu, CA 90265"
              value={form.location || ''}
              onChange={(e) => set('location', e.target.value)}
              className="w-full px-3 py-2 border border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
        </div>
      </div>

      {/* Financial */}
      <div>
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-3">
          Financial
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Total Price ($)</label>
            <input
              type="number"
              min={0}
              step={1}
              placeholder="1200"
              value={form.total_price_cents != null ? form.total_price_cents / 100 : ''}
              onChange={(e) =>
                set(
                  'total_price_cents',
                  e.target.value ? Math.round(Number(e.target.value) * 100) : null
                )
              }
              className="w-full px-3 py-2 border border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Commission %</label>
            <input
              type="number"
              min={0}
              max={50}
              step={1}
              value={form.commission_percent ?? defaultCommissionPercent}
              onChange={(e) => set('commission_percent', Number(e.target.value))}
              className="w-full px-3 py-2 border border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex items-end pb-2">
            {form.total_price_cents &&
              form.total_price_cents > 0 &&
              form.commission_percent != null &&
              form.commission_percent > 0 && (
                <div className="bg-amber-950 border border-amber-200 rounded-lg px-3 py-2 text-sm">
                  <span className="text-amber-700 font-medium">Commission: </span>
                  <span className="text-amber-900 font-semibold">
                    $
                    {(
                      (form.total_price_cents *
                        (form.commission_percent ?? defaultCommissionPercent)) /
                      10000
                    ).toFixed(2)}
                  </span>
                </div>
              )}
          </div>
        </div>

        <label className="flex items-center gap-2 mt-3 text-sm text-stone-400 cursor-pointer">
          <input
            type="checkbox"
            checked={form.log_commission ?? true}
            onChange={(e) => set('log_commission', e.target.checked)}
            className="rounded border-stone-600"
          />
          Log platform commission as a business expense
        </label>
      </div>

      {/* Dietary & Notes */}
      <div>
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-3">Notes</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Dietary Restrictions / Allergies
            </label>
            <input
              type="text"
              placeholder="Gluten-free, nut allergy..."
              value={form.dietary_restrictions || ''}
              onChange={(e) => set('dietary_restrictions', e.target.value)}
              className="w-full px-3 py-2 border border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Additional Notes
            </label>
            <textarea
              rows={3}
              placeholder="Any other details from the booking..."
              value={form.additional_notes || ''}
              onChange={(e) => set('additional_notes', e.target.value)}
              className="w-full px-3 py-2 border border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? 'Saving...' : 'Capture Booking'}
      </Button>
    </form>
  )
}
