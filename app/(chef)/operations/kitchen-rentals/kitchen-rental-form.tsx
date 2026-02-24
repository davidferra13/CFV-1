'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createKitchenRental } from '@/lib/kitchen-rentals/actions'

export function KitchenRentalForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    facility_name: '',
    address: '',
    rental_date: '',
    start_time: '',
    end_time: '',
    hours_booked: '',
    cost_dollars: '',
    purpose: '',
    booking_confirmation: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.facility_name || !form.rental_date || !form.cost_dollars) {
      setError('Facility name, date, and cost are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createKitchenRental({
        facility_name: form.facility_name,
        address: form.address || undefined,
        rental_date: form.rental_date,
        start_time: form.start_time || undefined,
        end_time: form.end_time || undefined,
        hours_booked: form.hours_booked ? parseFloat(form.hours_booked) : undefined,
        cost_cents: Math.round(parseFloat(form.cost_dollars) * 100),
        purpose: form.purpose || undefined,
        booking_confirmation: form.booking_confirmation || undefined,
        notes: form.notes || undefined,
      })
      setForm({
        facility_name: '',
        address: '',
        rental_date: '',
        start_time: '',
        end_time: '',
        hours_booked: '',
        cost_dollars: '',
        purpose: '',
        booking_confirmation: '',
        notes: '',
      })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-stone-400 mb-1">Facility name *</label>
          <Input
            value={form.facility_name}
            onChange={(e) => update('facility_name', e.target.value)}
            placeholder="Blue Apron Shared Kitchen"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Date *</label>
          <Input
            type="date"
            value={form.rental_date}
            onChange={(e) => update('rental_date', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Cost *</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.cost_dollars}
            onChange={(e) => update('cost_dollars', e.target.value)}
            placeholder="75.00"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Start time</label>
          <Input
            type="time"
            value={form.start_time}
            onChange={(e) => update('start_time', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">End time</label>
          <Input
            type="time"
            value={form.end_time}
            onChange={(e) => update('end_time', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Hours booked</label>
          <Input
            type="number"
            min="0.25"
            step="0.25"
            value={form.hours_booked}
            onChange={(e) => update('hours_booked', e.target.value)}
            placeholder="3.5"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">
            Booking confirmation #
          </label>
          <Input
            value={form.booking_confirmation}
            onChange={(e) => update('booking_confirmation', e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-400 mb-1">Address</label>
        <Input
          value={form.address}
          onChange={(e) => update('address', e.target.value)}
          placeholder="123 Main St, City, State"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-400 mb-1">Purpose</label>
        <Input
          value={form.purpose}
          onChange={(e) => update('purpose', e.target.value)}
          placeholder="Large batch prep for Smith event"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-400 mb-1">Notes</label>
        <Input
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Any additional notes"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button type="submit" size="sm" disabled={saving}>
        {saving ? 'Saving…' : 'Log Rental'}
      </Button>
    </form>
  )
}
