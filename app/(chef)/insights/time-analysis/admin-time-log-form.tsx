'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { logAdminTime } from '@/lib/admin-time/actions'
import { ADMIN_TIME_CATEGORIES } from '@/lib/admin-time/constants'
import { format } from 'date-fns'

export function AdminTimeLogForm({ eventId }: { eventId?: string }) {
  const router = useRouter()
  const [form, setForm] = useState({
    category: 'email' as (typeof ADMIN_TIME_CATEGORIES)[0]['value'],
    log_date: format(new Date(), 'yyyy-MM-dd'),
    hours: '',
    minutes_extra: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const totalMinutes = parseInt(form.hours || '0') * 60 + parseInt(form.minutes_extra || '0')
    if (totalMinutes <= 0) {
      setError('Enter at least 1 minute')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await logAdminTime({
        category: form.category,
        log_date: form.log_date,
        minutes: totalMinutes,
        notes: form.notes || undefined,
        event_id: eventId ?? null,
      })
      setForm((prev) => ({ ...prev, hours: '', minutes_extra: '', notes: '' }))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log time')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Category</label>
          <select
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
            className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
          >
            {ADMIN_TIME_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Date</label>
          <Input
            type="date"
            value={form.log_date}
            onChange={(e) => update('log_date', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Hours</label>
          <Input
            type="number"
            min="0"
            value={form.hours}
            onChange={(e) => update('hours', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Minutes</label>
          <Input
            type="number"
            min="0"
            max="59"
            value={form.minutes_extra}
            onChange={(e) => update('minutes_extra', e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-400 mb-1">Notes (optional)</label>
        <Input
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="e.g. Followed up with Johnson inquiry"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button type="submit" size="sm" disabled={saving}>
        {saving ? 'Logging…' : 'Log Time'}
      </Button>
    </form>
  )
}
