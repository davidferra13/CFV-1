'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { logTemperature, deleteTempLog } from '@/lib/compliance/actions'
import { SAFE_TEMP_RANGES } from '@/lib/compliance/constants'
import { format } from 'date-fns'

type TempLog = {
  id: string
  item_description: string
  temp_fahrenheit: number
  phase: string
  is_safe: boolean | null
  logged_at: string
  notes: string | null
}

const PHASES = [
  { value: 'receiving', label: 'Receiving' },
  { value: 'cold_holding', label: 'Cold Holding' },
  { value: 'hot_holding', label: 'Hot Holding' },
  { value: 'cooling', label: 'Cooling' },
  { value: 'reheating', label: 'Reheating' },
]

export function TempLogPanel({
  eventId,
  initialLogs,
}: {
  eventId: string
  initialLogs: TempLog[]
}) {
  const router = useRouter()
  const [logs, setLogs] = useState<TempLog[]>(initialLogs)
  const [form, setForm] = useState({
    item_description: '',
    temp_fahrenheit: '',
    phase: 'hot_holding',
    is_safe: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.item_description || !form.temp_fahrenheit) {
      setError('Item and temperature are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await logTemperature({
        event_id: eventId,
        item_description: form.item_description,
        temp_fahrenheit: parseFloat(form.temp_fahrenheit),
        phase: form.phase as Parameters<typeof logTemperature>[0]['phase'],
        is_safe: form.is_safe === '' ? undefined : form.is_safe === 'true',
        notes: form.notes || undefined,
      })
      setForm({
        item_description: '',
        temp_fahrenheit: '',
        phase: 'hot_holding',
        is_safe: '',
        notes: '',
      })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await deleteTempLog(id)
      router.refresh()
    } catch {
      // silent
    } finally {
      setDeleting(null)
    }
  }

  const phaseLabel = (phase: string) => PHASES.find((p) => p.value === phase)?.label ?? phase

  return (
    <div className="space-y-3">
      {/* Existing logs */}
      {initialLogs.length === 0 && !open && (
        <p className="text-sm text-stone-500">No temperature readings logged yet.</p>
      )}

      {initialLogs.length > 0 && (
        <div className="divide-y divide-stone-800">
          {initialLogs.map((log) => (
            <div key={log.id} className="flex items-start justify-between py-2 gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-stone-100">{log.item_description}</span>
                  <span className="text-sm text-stone-300 font-mono">{log.temp_fahrenheit}°F</span>
                  <Badge variant="default">{phaseLabel(log.phase)}</Badge>
                  {log.is_safe === true && <Badge variant="success">Safe</Badge>}
                  {log.is_safe === false && <Badge variant="error">Unsafe</Badge>}
                </div>
                <p className="text-xs text-stone-400">
                  {format(new Date(log.logged_at), 'MMM d, h:mm a')}
                  {log.notes ? ` · ${log.notes}` : ''}
                </p>
                <p className="text-xs text-stone-400 italic">
                  Safe range: {SAFE_TEMP_RANGES[log.phase]?.label ?? '—'}
                </p>
              </div>
              <button
                onClick={() => handleDelete(log.id)}
                disabled={deleting === log.id}
                className="text-xs text-stone-300 hover:text-red-500 mt-1"
              >
                {deleting === log.id ? '…' : '✕'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Toggle form */}
      {!open && (
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          + Log Temperature
        </Button>
      )}

      {open && (
        <form onSubmit={handleAdd} className="space-y-3 pt-2 border-t border-stone-800">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-stone-400 mb-1">Item *</label>
              <Input
                value={form.item_description}
                onChange={(e) => update('item_description', e.target.value)}
                placeholder="Chicken breast, beef tenderloin…"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Temp (°F) *</label>
              <Input
                type="number"
                step="0.1"
                value={form.temp_fahrenheit}
                onChange={(e) => update('temp_fahrenheit', e.target.value)}
                placeholder="145.0"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Phase</label>
              <select
                className="w-full rounded-md border border-stone-700 bg-surface px-3 py-2 text-sm"
                value={form.phase}
                onChange={(e) => update('phase', e.target.value)}
              >
                {PHASES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Safe?</label>
              <select
                className="w-full rounded-md border border-stone-700 bg-surface px-3 py-2 text-sm"
                value={form.is_safe}
                onChange={(e) => update('is_safe', e.target.value)}
              >
                <option value="">Not assessed</option>
                <option value="true">Safe ✓</option>
                <option value="false">Unsafe ✗</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Notes</label>
              <Input
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          {form.phase && (
            <p className="text-xs text-stone-400 italic">
              Safe range: {SAFE_TEMP_RANGES[form.phase]?.label ?? '—'}
            </p>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Logging…' : 'Log Reading'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
