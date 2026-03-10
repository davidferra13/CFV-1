'use client'

// Freelancer Roster Component
// Filtered view of freelance staff with management capabilities.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  createFreelancer,
  updateFreelancer,
  getFreelancerEventHistory,
  type CreateFreelancerInput,
} from '@/lib/staff/freelance-actions'
import { deactivateStaffMember } from '@/lib/staff/actions'
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

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  on_completion: 'On Completion',
  net_15: 'Net 15',
  net_30: 'Net 30',
}

const ROLE_LABELS: Record<string, string> = {
  sous_chef: 'Sous Chef',
  kitchen_assistant: 'Kitchen Assistant',
  service_staff: 'Service Staff',
  server: 'Server',
  bartender: 'Bartender',
  dishwasher: 'Dishwasher',
  other: 'Other',
}

type FreelancerData = {
  id: string
  name: string
  role: string
  phone: string | null
  email: string | null
  hourly_rate_cents: number
  day_rate_cents: number | null
  agency_name: string | null
  payment_terms: string | null
  tax_id_on_file: boolean
  contract_notes: string | null
  notes: string | null
  status: string
}

type Props = {
  freelancers: FreelancerData[]
}

export function FreelancerRoster({ freelancers }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [eventHistory, setEventHistory] = useState<Record<string, any>>({})
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null)

  async function toggleHistory(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (!eventHistory[id]) {
      setLoadingHistory(id)
      try {
        const history = await getFreelancerEventHistory(id)
        setEventHistory((prev) => ({ ...prev, [id]: history }))
      } catch (err) {
        trackError('Failed to load event history', 'Freelancer roster')
      } finally {
        setLoadingHistory(null)
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Freelancer List */}
      {freelancers.length === 0 ? (
        <p className="text-sm text-stone-500">No freelancers on your roster yet. Add one below.</p>
      ) : (
        freelancers.map((f) => (
          <Card key={f.id}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-stone-100">{f.name}</span>
                    <Badge variant="default">{ROLE_LABELS[f.role] ?? f.role}</Badge>
                    <Badge variant="info">Freelance</Badge>
                    <Badge variant={f.status === 'active' ? 'success' : 'error'}>{f.status}</Badge>
                    {f.tax_id_on_file && <Badge variant="success">Tax ID</Badge>}
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-stone-500">
                    {f.day_rate_cents != null && f.day_rate_cents > 0 && (
                      <span>${(f.day_rate_cents / 100).toFixed(2)}/day</span>
                    )}
                    {f.hourly_rate_cents > 0 && (
                      <span>${(f.hourly_rate_cents / 100).toFixed(2)}/hr</span>
                    )}
                    {f.agency_name && <span>Agency: {f.agency_name}</span>}
                    {f.payment_terms && (
                      <span>{PAYMENT_TERMS_LABELS[f.payment_terms] ?? f.payment_terms}</span>
                    )}
                    {f.phone && <span>{f.phone}</span>}
                    {f.email && <span>{f.email}</span>}
                  </div>

                  {f.contract_notes && (
                    <p className="mt-1 text-xs text-stone-400">{f.contract_notes}</p>
                  )}
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-stone-400"
                    onClick={() => toggleHistory(f.id)}
                  >
                    {expandedId === f.id ? 'Hide' : 'History'}
                  </Button>
                  {f.status === 'active' && (
                    <form
                      action={async () => {
                        await deactivateStaffMember(f.id)
                        router.refresh()
                      }}
                    >
                      <Button type="submit" variant="ghost" size="sm" className="text-stone-400">
                        Deactivate
                      </Button>
                    </form>
                  )}
                </div>
              </div>

              {/* Event History (expanded) */}
              {expandedId === f.id && (
                <div className="mt-3 border-t border-stone-700 pt-3">
                  {loadingHistory === f.id ? (
                    <p className="text-xs text-stone-500">Loading history...</p>
                  ) : eventHistory[f.id] ? (
                    <div className="space-y-2">
                      <div className="flex gap-4 text-xs text-stone-400">
                        <span>Events: {eventHistory[f.id].totalEvents}</span>
                        <span>Completed: {eventHistory[f.id].completedEvents}</span>
                        <span>
                          Total earned: ${(eventHistory[f.id].totalEarnedCents / 100).toFixed(2)}
                        </span>
                      </div>
                      {eventHistory[f.id].assignments.length > 0 && (
                        <div className="space-y-1">
                          {eventHistory[f.id].assignments.slice(0, 5).map((a: any) => (
                            <div key={a.id} className="flex justify-between text-xs text-stone-500">
                              <span>
                                {a.events?.title ?? 'Unknown'} ({a.events?.event_date ?? '?'})
                              </span>
                              <span>
                                {a.pay_amount_cents != null
                                  ? `$${(a.pay_amount_cents / 100).toFixed(2)}`
                                  : a.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500">No history available</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {/* Add Freelancer Form */}
      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Freelancer</CardTitle>
          </CardHeader>
          <CardContent>
            <FreelancerForm
              onDone={() => {
                setShowForm(false)
                router.refresh()
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowForm(true)}>Add Freelancer</Button>
      )}
    </div>
  )
}

// ============================================
// FREELANCER FORM
// ============================================

function FreelancerForm({ onDone }: { onDone: () => void }) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    role: 'other' as CreateFreelancerInput['role'],
    phone: '',
    email: '',
    hourly_rate_dollars: '',
    day_rate_dollars: '',
    agency_name: '',
    payment_terms: '' as string,
    tax_id_on_file: false,
    contract_notes: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setActiveForm('Add Freelancer')
    return () => setActiveForm(null)
  }, [])

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const input: CreateFreelancerInput = {
      name: form.name,
      role: form.role,
      phone: form.phone || undefined,
      email: form.email || undefined,
      hourly_rate_cents: Math.round(parseFloat(form.hourly_rate_dollars || '0') * 100),
      day_rate_cents: form.day_rate_dollars
        ? Math.round(parseFloat(form.day_rate_dollars) * 100)
        : null,
      agency_name: form.agency_name || undefined,
      payment_terms: (form.payment_terms || null) as any,
      tax_id_on_file: form.tax_id_on_file,
      contract_notes: form.contract_notes || undefined,
      notes: form.notes || undefined,
    }

    try {
      await createFreelancer(input)
      trackAction('Added freelancer', `${form.name} (${form.role})`)
      router.refresh()
      onDone()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      setError(msg)
      trackError(msg, 'Freelancer form')
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
            placeholder="freelancer@example.com"
            type="email"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Hourly Rate ($)</label>
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
          <label className="block text-sm font-medium text-stone-300 mb-1">Day Rate ($)</label>
          <Input
            value={form.day_rate_dollars}
            onChange={(e) => update('day_rate_dollars', e.target.value)}
            placeholder="250.00"
            type="number"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Agency</label>
          <Input
            value={form.agency_name}
            onChange={(e) => update('agency_name', e.target.value)}
            placeholder="Staffing agency name (optional)"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Payment Terms</label>
          <select
            value={form.payment_terms}
            onChange={(e) => update('payment_terms', e.target.value)}
            className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
          >
            <option value="">Select terms</option>
            <option value="on_completion">On Completion</option>
            <option value="net_15">Net 15</option>
            <option value="net_30">Net 30</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="tax_id_on_file"
          checked={form.tax_id_on_file}
          onChange={(e) => update('tax_id_on_file', e.target.checked)}
          className="rounded border-stone-600"
        />
        <label htmlFor="tax_id_on_file" className="text-sm text-stone-300">
          Tax ID / W-9 on file
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1">Contract Notes</label>
        <textarea
          value={form.contract_notes}
          onChange={(e) => update('contract_notes', e.target.value)}
          rows={2}
          placeholder="Special terms, insurance requirements, certifications..."
          className="w-full rounded-lg border border-stone-600 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          rows={2}
          placeholder="General notes about this freelancer..."
          className="w-full rounded-lg border border-stone-600 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Add Freelancer'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
