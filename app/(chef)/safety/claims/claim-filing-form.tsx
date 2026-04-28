'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { fileClaim } from './actions'

const CLAIM_TYPES = [
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'bodily_injury', label: 'Bodily Injury' },
  { value: 'food_illness', label: 'Food Illness' },
  { value: 'equipment_loss', label: 'Equipment Loss' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'other', label: 'Other' },
] as const

type ClaimType = (typeof CLAIM_TYPES)[number]['value']

type ClaimFormState = {
  claimType: ClaimType
  incidentDate: string
  description: string
  amountDollars: string
  policyNumber: string
  adjusterName: string
  adjusterPhone: string
  adjusterEmail: string
  evidenceUrls: string
  witnessInfo: string
}

const initialForm: ClaimFormState = {
  claimType: 'property_damage',
  incidentDate: new Date().toISOString().slice(0, 10),
  description: '',
  amountDollars: '',
  policyNumber: '',
  adjusterName: '',
  adjusterPhone: '',
  adjusterEmail: '',
  evidenceUrls: '',
  witnessInfo: '',
}

function parseAmountCents(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const amount = Number(trimmed)
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Claim amount must be a valid non-negative dollar amount.')
  }

  return Math.round(amount * 100)
}

function parseEvidenceUrls(value: string) {
  return value
    .split('\n')
    .map((url) => url.trim())
    .filter(Boolean)
}

export function ClaimFilingForm() {
  const router = useRouter()
  const [form, setForm] = useState<ClaimFormState>(initialForm)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function update<K extends keyof ClaimFormState>(field: K, value: ClaimFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const description = form.description.trim()
    if (!description) {
      setError('Describe what happened before filing the claim.')
      return
    }

    if (!form.incidentDate) {
      setError('Incident date is required.')
      return
    }

    let amountCents: number | null
    try {
      amountCents = parseAmountCents(form.amountDollars)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Claim amount is invalid.')
      return
    }

    startTransition(async () => {
      try {
        await fileClaim({
          claim_type: form.claimType,
          incident_date: form.incidentDate,
          description,
          amount_cents: amountCents,
          policy_number: form.policyNumber.trim() || null,
          adjuster_name: form.adjusterName.trim() || null,
          adjuster_phone: form.adjusterPhone.trim() || null,
          adjuster_email: form.adjusterEmail.trim() || null,
          evidence_urls: parseEvidenceUrls(form.evidenceUrls),
          witness_info: form.witnessInfo.trim() || null,
        })

        toast.success('Insurance claim filed')
        setForm(initialForm)
        router.push('/safety/claims')
        router.refresh()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to file claim.'
        setError(message)
        toast.error(message)
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-stone-700 bg-stone-800 p-4"
    >
      <div>
        <h2 className="text-lg font-semibold text-stone-100">File a Claim</h2>
        <p className="mt-1 text-sm text-stone-500">
          Record the incident, policy details, and supporting evidence for your insurer.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="claim-type" className="mb-1.5 block text-sm font-medium text-stone-300">
            Claim Type
          </label>
          <select
            id="claim-type"
            value={form.claimType}
            onChange={(event) => update('claimType', event.target.value as ClaimType)}
            className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            {CLAIM_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Incident Date"
          type="date"
          required
          value={form.incidentDate}
          onChange={(event) => update('incidentDate', event.target.value)}
        />

        <Input
          label="Claim Amount"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="2500.00"
          value={form.amountDollars}
          onChange={(event) => update('amountDollars', event.target.value)}
        />

        <Input
          label="Policy Number"
          placeholder="Policy or certificate number"
          value={form.policyNumber}
          onChange={(event) => update('policyNumber', event.target.value)}
        />

        <Input
          label="Adjuster Name"
          placeholder="Assigned adjuster"
          value={form.adjusterName}
          onChange={(event) => update('adjusterName', event.target.value)}
        />

        <Input
          label="Adjuster Phone"
          type="tel"
          placeholder="Phone number"
          value={form.adjusterPhone}
          onChange={(event) => update('adjusterPhone', event.target.value)}
        />

        <Input
          label="Adjuster Email"
          type="email"
          placeholder="adjuster@example.com"
          value={form.adjusterEmail}
          onChange={(event) => update('adjusterEmail', event.target.value)}
        />
      </div>

      <Textarea
        label="Description"
        required
        rows={4}
        value={form.description}
        onChange={(event) => update('description', event.target.value)}
        placeholder="Describe what happened, who was involved, and what immediate steps were taken."
      />

      <Textarea
        label="Evidence URLs"
        rows={3}
        value={form.evidenceUrls}
        onChange={(event) => update('evidenceUrls', event.target.value)}
        placeholder="Add one supporting document or photo URL per line."
      />

      <Textarea
        label="Witness Information"
        rows={3}
        value={form.witnessInfo}
        onChange={(event) => update('witnessInfo', event.target.value)}
        placeholder="Names, contact details, and notes from anyone who witnessed the incident."
      />

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" loading={isPending}>
        File Claim
      </Button>
    </form>
  )
}
