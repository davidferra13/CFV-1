'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  createPolicy,
  updatePolicy,
  type InsurancePolicy,
  type InsurancePolicyType,
  type CreateInsurancePolicyInput,
} from '@/lib/compliance/insurance-actions'

const POLICY_TYPES: { value: InsurancePolicyType; label: string }[] = [
  { value: 'general_liability', label: 'General Liability' },
  { value: 'product_liability', label: 'Product Liability' },
  { value: 'professional_liability', label: 'Professional Liability' },
  { value: 'workers_comp', label: "Workers' Comp" },
  { value: 'commercial_auto', label: 'Commercial Auto' },
  { value: 'property', label: 'Property' },
  { value: 'umbrella', label: 'Umbrella' },
  { value: 'other', label: 'Other' },
]

function centsToDollars(cents: number | null | undefined): string {
  if (cents == null) return ''
  return (cents / 100).toFixed(2)
}

function dollarsToCents(dollars: string): number | undefined {
  if (!dollars.trim()) return undefined
  const parsed = parseFloat(dollars)
  if (isNaN(parsed)) return undefined
  return Math.round(parsed * 100)
}

interface Props {
  policy?: InsurancePolicy | null
  onClose: (saved?: boolean) => void
}

export function InsurancePolicyForm({ policy, onClose }: Props) {
  const isEditing = !!policy

  const [policyType, setPolicyType] = useState<InsurancePolicyType>(
    policy?.policy_type ?? 'general_liability'
  )
  const [provider, setProvider] = useState(policy?.provider ?? '')
  const [policyNumber, setPolicyNumber] = useState(policy?.policy_number ?? '')
  const [coverageDollars, setCoverageDollars] = useState(
    centsToDollars(policy?.coverage_amount_cents)
  )
  const [premiumDollars, setPremiumDollars] = useState(
    centsToDollars(policy?.premium_cents)
  )
  const [startDate, setStartDate] = useState(policy?.start_date ?? '')
  const [endDate, setEndDate] = useState(policy?.end_date ?? '')
  const [autoRenew, setAutoRenew] = useState(policy?.auto_renew ?? false)
  const [documentUrl, setDocumentUrl] = useState(policy?.document_url ?? '')
  const [notes, setNotes] = useState(policy?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!provider.trim()) {
      setError('Provider is required')
      return
    }
    if (!startDate || !endDate) {
      setError('Start and end dates are required')
      return
    }

    const input: CreateInsurancePolicyInput = {
      policy_type: policyType,
      provider: provider.trim(),
      policy_number: policyNumber.trim() || undefined,
      coverage_amount_cents: dollarsToCents(coverageDollars),
      premium_cents: dollarsToCents(premiumDollars),
      start_date: startDate,
      end_date: endDate,
      auto_renew: autoRenew,
      document_url: documentUrl.trim() || undefined,
      notes: notes.trim() || undefined,
    }

    setError(null)
    startTransition(async () => {
      try {
        if (isEditing) {
          await updatePolicy(policy!.id, input)
        } else {
          await createPolicy(input)
        }
        onClose(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save policy')
      }
    })
  }

  const inputClass = 'w-full rounded border px-3 py-2 text-sm'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {isEditing ? 'Edit Policy' : 'Add Insurance Policy'}
        </h2>
        <Button variant="ghost" onClick={() => onClose()}>
          Cancel
        </Button>
      </div>

      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Policy Type */}
        <div>
          <label className={labelClass}>Policy Type</label>
          <select
            className={inputClass}
            value={policyType}
            onChange={e => setPolicyType(e.target.value as InsurancePolicyType)}
          >
            {POLICY_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Provider */}
        <div>
          <label className={labelClass}>Provider</label>
          <input
            className={inputClass}
            type="text"
            value={provider}
            onChange={e => setProvider(e.target.value)}
            placeholder="e.g. State Farm, FLIP"
            required
          />
        </div>

        {/* Policy Number */}
        <div>
          <label className={labelClass}>Policy Number</label>
          <input
            className={inputClass}
            type="text"
            value={policyNumber}
            onChange={e => setPolicyNumber(e.target.value)}
            placeholder="Optional"
          />
        </div>

        {/* Coverage + Premium (side by side) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Coverage Amount ($)</label>
            <input
              className={inputClass}
              type="number"
              step="0.01"
              min="0"
              value={coverageDollars}
              onChange={e => setCoverageDollars(e.target.value)}
              placeholder="e.g. 1000000.00"
            />
          </div>
          <div>
            <label className={labelClass}>Annual Premium ($)</label>
            <input
              className={inputClass}
              type="number"
              step="0.01"
              min="0"
              value={premiumDollars}
              onChange={e => setPremiumDollars(e.target.value)}
              placeholder="e.g. 500.00"
            />
          </div>
        </div>

        {/* Start + End Date (side by side) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Start Date</label>
            <input
              className={inputClass}
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass}>End Date</label>
            <input
              className={inputClass}
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Auto Renew */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="auto-renew"
            checked={autoRenew}
            onChange={e => setAutoRenew(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="auto-renew" className="text-sm text-gray-700">
            Auto-renew
          </label>
        </div>

        {/* Document URL */}
        <div>
          <label className={labelClass}>Document URL</label>
          <input
            className={inputClass}
            type="url"
            value={documentUrl}
            onChange={e => setDocumentUrl(e.target.value)}
            placeholder="Link to policy document (optional)"
          />
        </div>

        {/* Notes */}
        <div>
          <label className={labelClass}>Notes</label>
          <textarea
            className={inputClass}
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Additional notes (optional)"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? 'Saving...' : isEditing ? 'Update Policy' : 'Add Policy'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => onClose()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
