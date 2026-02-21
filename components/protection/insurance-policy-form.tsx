'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { addPolicy, updatePolicy } from '@/lib/protection/insurance-actions'
import type { AddPolicyInput } from '@/lib/protection/insurance-actions'

interface ExistingPolicy {
  id: string
  policy_type: string
  carrier: string | null
  policy_number: string | null
  coverage_limit_cents: number | null
  effective_date: string | null
  expiry_date: string | null
  notes: string | null
}

interface InsurancePolicyFormProps {
  policy?: ExistingPolicy
  onClose: () => void
  onSuccess?: (policy: any) => void
}

const POLICY_TYPES = [
  { value: 'general_liability', label: 'General Liability' },
  { value: 'liquor_liability', label: 'Liquor Liability' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'workers_comp', label: "Workers' Compensation" },
  { value: 'professional_liability', label: 'Professional Liability' },
  { value: 'disability', label: 'Disability' },
  { value: 'health', label: 'Health' },
  { value: 'other', label: 'Other' },
]

export function InsurancePolicyForm({ policy, onClose, onSuccess }: InsurancePolicyFormProps) {
  const isEditing = !!policy

  const [form, setForm] = useState({
    policy_type: policy?.policy_type ?? 'general_liability',
    carrier: policy?.carrier ?? '',
    policy_number: policy?.policy_number ?? '',
    coverage_limit_dollars: policy?.coverage_limit_cents
      ? String(policy.coverage_limit_cents / 100)
      : '',
    effective_date: policy?.effective_date ?? '',
    expiry_date: policy?.expiry_date ?? '',
    notes: policy?.notes ?? '',
  })

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const coverageCents = form.coverage_limit_dollars
      ? Math.round(parseFloat(form.coverage_limit_dollars) * 100)
      : undefined

    if (form.coverage_limit_dollars && isNaN(coverageCents!)) {
      setError('Coverage limit must be a valid dollar amount.')
      return
    }

    const input: AddPolicyInput = {
      policy_type: form.policy_type as AddPolicyInput['policy_type'],
      carrier: form.carrier,
      policy_number: form.policy_number || undefined,
      coverage_limit_cents: coverageCents,
      effective_date: form.effective_date || undefined,
      expiry_date: form.expiry_date || undefined,
      notes: form.notes || undefined,
    }

    startTransition(async () => {
      try {
        let result: any
        if (isEditing) {
          result = await updatePolicy(policy.id, input)
        } else {
          result = await addPolicy(input)
        }
        onSuccess?.(result)
        if (!isEditing) onClose()
      } catch (err: any) {
        setError(err.message ?? 'Something went wrong.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-semibold text-stone-900">
        {isEditing ? 'Edit Policy' : 'Add Insurance Policy'}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Policy Type</label>
          <select
            value={form.policy_type}
            onChange={(e) => update('policy_type', e.target.value)}
            title="Policy Type"
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          >
            {POLICY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Carrier</label>
          <input
            type="text"
            value={form.carrier}
            onChange={(e) => update('carrier', e.target.value)}
            placeholder="e.g. Nationwide, Hiscox"
            required
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Policy Number</label>
          <input
            type="text"
            value={form.policy_number}
            onChange={(e) => update('policy_number', e.target.value)}
            placeholder="Optional"
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">
            Coverage Limit ($)
          </label>
          <input
            type="number"
            value={form.coverage_limit_dollars}
            onChange={(e) => update('coverage_limit_dollars', e.target.value)}
            placeholder="e.g. 1000000"
            min="0"
            step="1"
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Effective Date</label>
          <input
            type="date"
            value={form.effective_date}
            onChange={(e) => update('effective_date', e.target.value)}
            title="Effective Date"
            placeholder="Effective date"
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Expiry Date</label>
          <input
            type="date"
            value={form.expiry_date}
            onChange={(e) => update('expiry_date', e.target.value)}
            title="Expiry Date"
            placeholder="Expiry date"
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-500 mb-1">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Any additional notes..."
          rows={2}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" loading={isPending}>
          {isEditing ? 'Save Changes' : 'Add Policy'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
