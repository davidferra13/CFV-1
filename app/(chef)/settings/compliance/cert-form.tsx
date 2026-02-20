'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createCertification } from '@/lib/compliance/actions'

const CERT_TYPES = [
  { value: 'food_handler',        label: 'Food Handler Card' },
  { value: 'servsafe_manager',    label: 'ServSafe Manager' },
  { value: 'allergen_awareness',  label: 'Allergen Awareness' },
  { value: 'llc',                 label: 'LLC Formation' },
  { value: 'business_license',    label: 'Business License' },
  { value: 'liability_insurance', label: 'Liability Insurance' },
  { value: 'cottage_food',        label: 'Cottage Food Permit' },
  { value: 'other',               label: 'Other' },
]

export function CertForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    cert_type:            'food_handler',
    name:                 '',
    issuing_body:         '',
    issued_date:          '',
    expiry_date:          '',
    reminder_days_before: '30',
    cert_number:          '',
    document_url:         '',
    status:               'active',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) { setError('Name is required.'); return }
    setSaving(true)
    setError(null)
    try {
      await createCertification({
        cert_type:            form.cert_type as Parameters<typeof createCertification>[0]['cert_type'],
        name:                 form.name,
        issuing_body:         form.issuing_body         || undefined,
        issued_date:          form.issued_date           || undefined,
        expiry_date:          form.expiry_date           || undefined,
        reminder_days_before: parseInt(form.reminder_days_before) || 30,
        cert_number:          form.cert_number           || undefined,
        document_url:         form.document_url          || undefined,
        status:               form.status as 'active' | 'expired' | 'pending_renewal',
      })
      setForm({
        cert_type: 'food_handler', name: '', issuing_body: '',
        issued_date: '', expiry_date: '', reminder_days_before: '30',
        cert_number: '', document_url: '', status: 'active',
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
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Type</label>
          <select
            className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900"
            value={form.cert_type}
            onChange={(e) => update('cert_type', e.target.value)}
          >
            {CERT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Status</label>
          <select
            className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900"
            value={form.status}
            onChange={(e) => update('status', e.target.value)}
          >
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="pending_renewal">Pending renewal</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-stone-600 mb-1">Name / description *</label>
          <Input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="ServSafe Manager Certification"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Issuing body</label>
          <Input
            value={form.issuing_body}
            onChange={(e) => update('issuing_body', e.target.value)}
            placeholder="National Restaurant Assoc."
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Certificate #</label>
          <Input
            value={form.cert_number}
            onChange={(e) => update('cert_number', e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Issued date</label>
          <Input
            type="date"
            value={form.issued_date}
            onChange={(e) => update('issued_date', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Expiry date</label>
          <Input
            type="date"
            value={form.expiry_date}
            onChange={(e) => update('expiry_date', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Remind me N days before expiry</label>
          <Input
            type="number"
            min="0"
            value={form.reminder_days_before}
            onChange={(e) => update('reminder_days_before', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Document URL</label>
          <Input
            type="url"
            value={form.document_url}
            onChange={(e) => update('document_url', e.target.value)}
            placeholder="https://… (optional)"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button type="submit" size="sm" disabled={saving}>
        {saving ? 'Saving…' : 'Add Certification'}
      </Button>
    </form>
  )
}
