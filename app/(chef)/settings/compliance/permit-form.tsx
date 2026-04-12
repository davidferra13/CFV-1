'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createPermit, deletePermit, updatePermitStatus } from '@/lib/compliance/permit-actions'
import type { PermitRow, PermitStatus } from '@/lib/compliance/permit-actions'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

const PERMIT_TYPES = [
  { value: 'health', label: 'Health Permit' },
  { value: 'business', label: 'Business License' },
  { value: 'fire', label: 'Fire Permit' },
  { value: 'parking', label: 'Parking Permit' },
  { value: 'vendor', label: 'Vendor Permit' },
  { value: 'mobile_food', label: 'Mobile Food Unit' },
  { value: 'other', label: 'Other' },
]

function permitExpiryStatus(expiryDate: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate + 'T00:00:00')
  const daysRemaining = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const tier =
    daysRemaining < 0
      ? 'expired'
      : daysRemaining <= 14
        ? 'critical'
        : daysRemaining <= 60
          ? 'warning'
          : 'ok'
  return { daysRemaining, tier } as {
    daysRemaining: number
    tier: 'ok' | 'warning' | 'critical' | 'expired'
  }
}

function ExpiryBadge({ expiryDate }: { expiryDate: string }) {
  const { daysRemaining, tier } = permitExpiryStatus(expiryDate)
  if (tier === 'expired') return <Badge variant="error">Expired</Badge>
  if (tier === 'critical') return <Badge variant="error">{daysRemaining}d left</Badge>
  if (tier === 'warning') return <Badge variant="warning">{daysRemaining}d left</Badge>
  return <Badge variant="success">{daysRemaining}d left</Badge>
}

export function PermitList({ permits }: { permits: PermitRow[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await deletePermit(id)
      router.refresh()
    } finally {
      setDeleting(null)
    }
  }

  async function handleStatusChange(id: string, status: PermitStatus) {
    await updatePermitStatus(id, status)
    router.refresh()
  }

  if (permits.length === 0) {
    return <p className="text-sm text-stone-500">No permits on file.</p>
  }

  return (
    <div className="space-y-3">
      {permits.map((permit) => (
        <div
          key={permit.id}
          className="rounded-lg border border-stone-700 bg-stone-900/60 px-4 py-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-stone-100">{permit.name}</span>
                <Badge variant="default">
                  {PERMIT_TYPES.find((t) => t.value === permit.permit_type)?.label ??
                    permit.permit_type}
                </Badge>
                <ExpiryBadge expiryDate={permit.expiry_date} />
              </div>
              {permit.issuing_authority && (
                <p className="mt-0.5 text-sm text-stone-400">{permit.issuing_authority}</p>
              )}
              <div className="mt-0.5 flex gap-3 text-xs text-stone-500 flex-wrap">
                {permit.issue_date && (
                  <span>
                    Issued {format(new Date(permit.issue_date + 'T00:00:00'), 'MMM d, yyyy')}
                  </span>
                )}
                <span>
                  Expires {format(new Date(permit.expiry_date + 'T00:00:00'), 'MMM d, yyyy')}
                </span>
                {permit.permit_number && <span>#{permit.permit_number}</span>}
              </div>
              {permit.document_url && (
                <a
                  href={permit.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-xs text-amber-700 underline"
                >
                  View document
                </a>
              )}
              {permit.notes && <p className="mt-1 text-xs text-stone-500 italic">{permit.notes}</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {permit.status === 'active' && (
                <button
                  type="button"
                  onClick={() => handleStatusChange(permit.id, 'pending_renewal')}
                  className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
                >
                  Mark renewal
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(permit.id)}
                disabled={deleting === permit.id}
                className="text-xs text-red-700 hover:text-red-500 transition-colors disabled:opacity-40"
              >
                {deleting === permit.id ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function PermitForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    permit_type: 'health',
    name: '',
    issuing_authority: '',
    permit_number: '',
    issue_date: '',
    expiry_date: '',
    renewal_lead_days: '30',
    document_url: '',
    notes: '',
    status: 'active',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) {
      setError('Name is required.')
      return
    }
    if (!form.expiry_date) {
      setError('Expiry date is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createPermit({
        permit_type: form.permit_type,
        name: form.name,
        issuing_authority: form.issuing_authority || null,
        permit_number: form.permit_number || null,
        issue_date: form.issue_date || null,
        expiry_date: form.expiry_date,
        renewal_lead_days: parseInt(form.renewal_lead_days) || 30,
        document_url: form.document_url || null,
        notes: form.notes || null,
        status: form.status as PermitStatus,
      })
      setForm({
        permit_type: 'health',
        name: '',
        issuing_authority: '',
        permit_number: '',
        issue_date: '',
        expiry_date: '',
        renewal_lead_days: '30',
        document_url: '',
        notes: '',
        status: 'active',
      })
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        + Add Permit
      </Button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-stone-700 bg-stone-900/40 p-4"
    >
      <p className="text-sm font-medium text-stone-300">Add Permit or License</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Type</label>
          <select
            className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
            value={form.permit_type}
            onChange={(e) => update('permit_type', e.target.value)}
          >
            {PERMIT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Status</label>
          <select
            className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
            value={form.status}
            onChange={(e) => update('status', e.target.value)}
          >
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="pending_renewal">Pending renewal</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-stone-400 mb-1">Name *</label>
          <Input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g. Boston Health Permit 2025"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Issuing authority</label>
          <Input
            value={form.issuing_authority}
            onChange={(e) => update('issuing_authority', e.target.value)}
            placeholder="City of Boston ISD"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Permit #</label>
          <Input
            value={form.permit_number}
            onChange={(e) => update('permit_number', e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Issue date</label>
          <Input
            type="date"
            value={form.issue_date}
            onChange={(e) => update('issue_date', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Expiry date *</label>
          <Input
            type="date"
            value={form.expiry_date}
            onChange={(e) => update('expiry_date', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">
            Remind N days before
          </label>
          <Input
            type="number"
            min="0"
            value={form.renewal_lead_days}
            onChange={(e) => update('renewal_lead_days', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Document URL</label>
          <Input
            type="url"
            value={form.document_url}
            onChange={(e) => update('document_url', e.target.value)}
            placeholder="https://… (optional)"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-stone-400 mb-1">Notes</label>
          <Input
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="Optional notes"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Saving...' : 'Add Permit'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false)
            setError(null)
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
