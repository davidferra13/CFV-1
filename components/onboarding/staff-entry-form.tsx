'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UserPlus, ArrowRight } from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { createStaffMember } from '@/lib/staff/actions'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics/posthog'

type StaffMember = {
  id: string
  name: string
  role: string
  hourly_rate_cents: number
}

const ROLES = [
  { value: 'sous_chef', label: 'Sous Chef' },
  { value: 'kitchen_assistant', label: 'Kitchen Assistant' },
  { value: 'service_staff', label: 'Service Staff' },
  { value: 'server', label: 'Server' },
  { value: 'bartender', label: 'Bartender' },
  { value: 'dishwasher', label: 'Dishwasher' },
  { value: 'other', label: 'Other' },
] as const

const EMPTY_FORM = {
  name: '',
  role: 'server' as (typeof ROLES)[number]['value'],
  email: '',
  phone: '',
  hourly_rate_dollars: '',
  notes: '',
}

export function StaffEntryForm({ initialStaff }: { initialStaff: StaffMember[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState(EMPTY_FORM)
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_HUB_PHASE_STARTED, { phase: 'staff' })
  }, [])

  function set(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    setError(null)

    const rateDollars = parseFloat(form.hourly_rate_dollars || '0')
    const rateCents = isNaN(rateDollars) ? 0 : Math.round(rateDollars * 100)

    startTransition(async () => {
      try {
        const result = await createStaffMember({
          name: form.name.trim(),
          role: form.role,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          hourly_rate_cents: rateCents,
          notes: form.notes.trim() || undefined,
        })
        trackEvent(ANALYTICS_EVENTS.ONBOARDING_HUB_PHASE_COMPLETED, { phase: 'staff' })
        setStaff((prev) => [
          ...prev,
          {
            id: result.id,
            name: result.name,
            role: result.role,
            hourly_rate_cents: result.hourly_rate_cents ?? 0,
          },
        ])
        setForm(EMPTY_FORM)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add staff member')
      }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* Form — left (3/5) */}
      <div className="lg:col-span-3 space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a Team Member</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-950 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Alex Rivera"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <select
                  value={form.role}
                  onChange={(e) => set('role', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="alex@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="(555) 000-0000"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Hourly Rate ($/hr)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.hourly_rate_dollars}
                onChange={(e) => set('hourly_rate_dollars', e.target.value)}
                placeholder="25.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Availability, specialties, preferences…"
              />
            </div>

            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isPending || !form.name.trim()}
              className="w-full"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {isPending ? 'Saving…' : 'Save & Add Another'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Staff list — right (2/5) */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Roster</span>
              <Badge variant="default">{staff.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {staff.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-6">No staff added yet.</p>
            ) : (
              <ul className="divide-y divide-stone-800">
                {staff.map((s) => (
                  <li key={s.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-stone-200">{s.name}</p>
                      <p className="text-xs text-stone-400 capitalize">
                        {s.role.replace(/_/g, ' ')}
                      </p>
                    </div>
                    {s.hourly_rate_cents > 0 && (
                      <span className="text-xs text-stone-500">
                        ${(s.hourly_rate_cents / 100).toFixed(0)}/hr
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Link href="/onboarding">
          <Button variant="primary" className="w-full">
            Back to Setup Overview
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>

        <Link href="/dashboard" className="block">
          <Button variant="ghost" className="w-full text-stone-500">
            Skip → Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
