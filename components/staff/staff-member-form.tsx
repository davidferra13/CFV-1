'use client'

// Staff Member Form
// Add or edit a staff member on the chef's roster.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createStaffMember, updateStaffMember, type CreateStaffInput } from '@/lib/staff/actions'
import { trackAction, setActiveForm, trackError } from '@/lib/ai/remy-activity-tracker'

const ROLES = [
  { value: 'sous_chef', label: 'Sous Chef' },
  { value: 'kitchen_assistant', label: 'Kitchen Assistant' },
  { value: 'service_staff', label: 'Service Staff' },
  { value: 'server', label: 'Server' },
  { value: 'bartender', label: 'Bartender' },
  { value: 'dishwasher', label: 'Dishwasher' },
  { value: 'other', label: 'Other' },
] as const

type StaffMember = {
  id: string
  name: string
  role: string
  phone: string | null
  email: string | null
  hourly_rate_cents: number
  notes: string | null
}

type Props = {
  member?: StaffMember
  onDone?: () => void
}

export function StaffMemberForm({ member, onDone }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: member?.name ?? '',
    role: (member?.role ?? 'other') as CreateStaffInput['role'],
    phone: member?.phone ?? '',
    email: member?.email ?? '',
    hourly_rate_dollars: member ? (member.hourly_rate_cents / 100).toFixed(2) : '',
    notes: member?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setActiveForm(member ? 'Edit Staff Member' : 'New Staff Member')
    return () => setActiveForm(null)
  }, [member])

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const input: CreateStaffInput = {
      name: form.name,
      role: form.role,
      phone: form.phone || undefined,
      email: form.email || undefined,
      hourly_rate_cents: Math.round(parseFloat(form.hourly_rate_dollars || '0') * 100),
      notes: form.notes || undefined,
    }

    try {
      if (member) {
        await updateStaffMember(member.id, input)
        trackAction('Updated staff member', form.name)
      } else {
        await createStaffMember(input)
        trackAction('Added staff member', `${form.name} — ${form.role}`)
      }
      router.refresh()
      onDone?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      setError(msg)
      trackError(msg, 'Staff member save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Name</label>
          <Input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Full name"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Role</label>
          <select
            value={form.role}
            onChange={(e) => update('role', e.target.value)}
            className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Phone</label>
          <Input
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="(617) 555-0123"
            type="tel"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Email</label>
          <Input
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="staff@example.com"
            type="email"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1">Hourly rate ($)</label>
        <Input
          value={form.hourly_rate_dollars}
          onChange={(e) => update('hourly_rate_dollars', e.target.value)}
          placeholder="25.00"
          type="number"
          min="0"
          step="0.01"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          rows={2}
          placeholder="Dietary restrictions, certifications, scheduling preferences…"
          className="w-full rounded-lg border border-stone-600 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : member ? 'Update' : 'Add to Roster'}
        </Button>
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
