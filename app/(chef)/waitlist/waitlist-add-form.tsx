'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addToWaitlist } from '@/lib/availability/actions'

export function WaitlistAddForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    requested_date: '',
    occasion: '',
    guest_count_estimate: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await addToWaitlist({
        requested_date: form.requested_date,
        occasion: form.occasion || undefined,
        guest_count_estimate: form.guest_count_estimate
          ? parseInt(form.guest_count_estimate)
          : undefined,
        notes: form.notes || undefined,
      })
      setForm({ requested_date: '', occasion: '', guest_count_estimate: '', notes: '' })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Requested date</label>
          <Input
            type="date"
            value={form.requested_date}
            onChange={(e) => update('requested_date', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Guest count</label>
          <Input
            type="number"
            min="1"
            value={form.guest_count_estimate}
            onChange={(e) => update('guest_count_estimate', e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-400 mb-1">Occasion</label>
        <Input
          value={form.occasion}
          onChange={(e) => update('occasion', e.target.value)}
          placeholder="Birthday dinner, anniversary…"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-400 mb-1">Notes</label>
        <Input
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Any additional context"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button type="submit" size="sm" disabled={saving}>
        {saving ? 'Adding…' : 'Add to Waitlist'}
      </Button>
    </form>
  )
}
