'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createClaim, type ClaimType } from '@/lib/compliance/claim-actions'

const CLAIM_TYPES: { value: ClaimType; label: string }[] = [
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'bodily_injury', label: 'Bodily Injury' },
  { value: 'food_illness', label: 'Food Illness' },
  { value: 'equipment_loss', label: 'Equipment Loss' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'other', label: 'Other' },
]

export default function ClaimFormClient() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [claimType, setClaimType] = useState<ClaimType>('property_damage')
  const [incidentDate, setIncidentDate] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [policyNumber, setPolicyNumber] = useState('')
  const [adjusterName, setAdjusterName] = useState('')
  const [adjusterPhone, setAdjusterPhone] = useState('')
  const [adjusterEmail, setAdjusterEmail] = useState('')
  const [witnessInfo, setWitnessInfo] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!incidentDate || !description.trim()) {
      toast.error('Incident date and description are required.')
      return
    }

    startTransition(async () => {
      try {
        const amountCents = amount ? Math.round(parseFloat(amount) * 100) : null
        if (amount && (isNaN(amountCents!) || amountCents! < 0)) {
          toast.error('Please enter a valid dollar amount.')
          return
        }

        await createClaim({
          claim_type: claimType,
          incident_date: incidentDate,
          description: description.trim(),
          amount_cents: amountCents,
          policy_number: policyNumber.trim() || null,
          adjuster_name: adjusterName.trim() || null,
          adjuster_phone: adjusterPhone.trim() || null,
          adjuster_email: adjusterEmail.trim() || null,
          witness_info: witnessInfo.trim() || null,
        })

        toast.success('Claim created successfully.')
        router.push('/settings/compliance/claims')
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to create claim. Please try again.'
        )
      }
    })
  }

  const inputClass =
    'w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-stone-100 placeholder:text-stone-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const labelClass = 'block text-sm font-medium text-stone-300 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Claim Type */}
      <div>
        <label htmlFor="claim_type" className={labelClass}>
          Claim Type *
        </label>
        <select
          id="claim_type"
          value={claimType}
          onChange={(e) => setClaimType(e.target.value as ClaimType)}
          className={inputClass}
        >
          {CLAIM_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Incident Date */}
      <div>
        <label htmlFor="incident_date" className={labelClass}>
          Incident Date *
        </label>
        <input
          id="incident_date"
          type="date"
          value={incidentDate}
          onChange={(e) => setIncidentDate(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className={labelClass}>
          Description *
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={4}
          placeholder="Describe what happened, where, and any immediate actions taken."
          className={inputClass}
        />
      </div>

      {/* Amount */}
      <div>
        <label htmlFor="amount" className={labelClass}>
          Estimated Amount ($)
        </label>
        <input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className={inputClass}
        />
      </div>

      {/* Policy Number */}
      <div>
        <label htmlFor="policy_number" className={labelClass}>
          Policy Number
        </label>
        <input
          id="policy_number"
          type="text"
          value={policyNumber}
          onChange={(e) => setPolicyNumber(e.target.value)}
          placeholder="e.g. POL-123456"
          className={inputClass}
        />
      </div>

      {/* Adjuster Info Section */}
      <fieldset className="space-y-4 rounded-md border border-stone-700 p-4">
        <legend className="px-2 text-sm font-medium text-stone-400">
          Adjuster Information (optional)
        </legend>

        <div>
          <label htmlFor="adjuster_name" className={labelClass}>
            Name
          </label>
          <input
            id="adjuster_name"
            type="text"
            value={adjusterName}
            onChange={(e) => setAdjusterName(e.target.value)}
            placeholder="Adjuster full name"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="adjuster_phone" className={labelClass}>
            Phone
          </label>
          <input
            id="adjuster_phone"
            type="tel"
            value={adjusterPhone}
            onChange={(e) => setAdjusterPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="adjuster_email" className={labelClass}>
            Email
          </label>
          <input
            id="adjuster_email"
            type="email"
            value={adjusterEmail}
            onChange={(e) => setAdjusterEmail(e.target.value)}
            placeholder="adjuster@insurance.com"
            className={inputClass}
          />
        </div>
      </fieldset>

      {/* Witness Info */}
      <div>
        <label htmlFor="witness_info" className={labelClass}>
          Witness Information
        </label>
        <textarea
          id="witness_info"
          value={witnessInfo}
          onChange={(e) => setWitnessInfo(e.target.value)}
          rows={3}
          placeholder="Names, contact info, and statements from any witnesses."
          className={inputClass}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Filing Claim...' : 'File Claim'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/settings/compliance/claims')}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
