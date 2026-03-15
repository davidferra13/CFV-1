'use client'

import { useState, useTransition } from 'react'
import {
  createClaim,
  updateClaim,
  updateClaimStatus,
  type InsuranceClaim,
  type ClaimType,
  type ClaimStatus,
  type CreateClaimInput,
} from '@/lib/compliance/claim-actions'

const CLAIM_TYPES: { value: ClaimType; label: string }[] = [
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'bodily_injury', label: 'Bodily Injury' },
  { value: 'food_illness', label: 'Food Illness' },
  { value: 'equipment_loss', label: 'Equipment Loss' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'other', label: 'Other' },
]

const STATUS_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  documenting: ['filed'],
  filed: ['under_review'],
  under_review: ['approved', 'denied'],
  approved: ['settled'],
  denied: [],
  settled: [],
}

interface ClaimFormProps {
  claim?: InsuranceClaim | null
  events?: { id: string; title: string; event_date: string }[]
  onSaved?: (claim: InsuranceClaim) => void
  onCancel?: () => void
}

export function ClaimForm({ claim, events = [], onSaved, onCancel }: ClaimFormProps) {
  const isEditing = !!claim
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [claimType, setClaimType] = useState<ClaimType>(claim?.claim_type ?? 'property_damage')
  const [eventId, setEventId] = useState(claim?.event_id ?? '')
  const [incidentDate, setIncidentDate] = useState(claim?.incident_date ?? '')
  const [description, setDescription] = useState(claim?.description ?? '')
  const [amountDollars, setAmountDollars] = useState(
    claim?.amount_cents != null ? (claim.amount_cents / 100).toString() : ''
  )
  const [policyNumber, setPolicyNumber] = useState(claim?.policy_number ?? '')
  const [adjusterName, setAdjusterName] = useState(claim?.adjuster_name ?? '')
  const [adjusterPhone, setAdjusterPhone] = useState(claim?.adjuster_phone ?? '')
  const [adjusterEmail, setAdjusterEmail] = useState(claim?.adjuster_email ?? '')
  const [witnessInfo, setWitnessInfo] = useState(claim?.witness_info ?? '')
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>(claim?.evidence_urls ?? [])
  const [newEvidenceUrl, setNewEvidenceUrl] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState(claim?.resolution_notes ?? '')

  function addEvidenceUrl() {
    const url = newEvidenceUrl.trim()
    if (!url) return
    try {
      new URL(url)
      setEvidenceUrls(prev => [...prev, url])
      setNewEvidenceUrl('')
    } catch {
      setError('Please enter a valid URL')
    }
  }

  function removeEvidenceUrl(index: number) {
    setEvidenceUrls(prev => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const amountCents = amountDollars ? Math.round(parseFloat(amountDollars) * 100) : null

    startTransition(async () => {
      try {
        if (isEditing && claim) {
          const result = await updateClaim(claim.id, {
            claim_type: claimType,
            event_id: eventId || null,
            incident_date: incidentDate,
            description,
            amount_cents: amountCents,
            policy_number: policyNumber || null,
            adjuster_name: adjusterName || null,
            adjuster_phone: adjusterPhone || null,
            adjuster_email: adjusterEmail || null,
            evidence_urls: evidenceUrls,
            witness_info: witnessInfo || null,
            resolution_notes: resolutionNotes || null,
          })
          onSaved?.(result)
        } else {
          const input: CreateClaimInput = {
            claim_type: claimType,
            event_id: eventId || null,
            incident_date: incidentDate,
            description,
            amount_cents: amountCents,
            policy_number: policyNumber || null,
            adjuster_name: adjusterName || null,
            adjuster_phone: adjusterPhone || null,
            adjuster_email: adjusterEmail || null,
            evidence_urls: evidenceUrls,
            witness_info: witnessInfo || null,
          }
          const result = await createClaim(input)
          onSaved?.(result)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save claim')
      }
    })
  }

  function handleStatusTransition(newStatus: ClaimStatus) {
    if (!claim) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await updateClaimStatus(claim.id, newStatus)
        onSaved?.(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update status')
      }
    })
  }

  const availableTransitions = claim ? STATUS_TRANSITIONS[claim.status] ?? [] : []

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Claim Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Claim Type</label>
        <select
          value={claimType}
          onChange={e => setClaimType(e.target.value as ClaimType)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          required
        >
          {CLAIM_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Linked Event */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Linked Event (optional)</label>
        <select
          value={eventId}
          onChange={e => setEventId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">No linked event</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>
              {ev.title} ({new Date(ev.event_date).toLocaleDateString()})
            </option>
          ))}
        </select>
      </div>

      {/* Incident Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Incident Date</label>
        <input
          type="date"
          value={incidentDate}
          onChange={e => setIncidentDate(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="Describe what happened in detail..."
          required
        />
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Claim Amount ($)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={amountDollars}
          onChange={e => setAmountDollars(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="0.00"
        />
      </div>

      {/* Evidence URLs */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Evidence (photo/document URLs)</label>
        <div className="mt-1 space-y-2">
          {evidenceUrls.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 truncate rounded-md bg-gray-50 px-3 py-1.5 text-sm text-gray-600">
                {url}
              </span>
              <button
                type="button"
                onClick={() => removeEvidenceUrl(i)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="url"
              value={newEvidenceUrl}
              onChange={e => setNewEvidenceUrl(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              placeholder="https://..."
            />
            <button
              type="button"
              onClick={addEvidenceUrl}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Witness Info */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Witness Information</label>
        <textarea
          value={witnessInfo}
          onChange={e => setWitnessInfo(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="Names, contact info, and statements from witnesses..."
        />
      </div>

      {/* Policy & Adjuster */}
      <fieldset className="rounded-lg border border-gray-200 p-4">
        <legend className="px-2 text-sm font-medium text-gray-700">Insurance Details</legend>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600">Policy Number</label>
            <input
              type="text"
              value={policyNumber}
              onChange={e => setPolicyNumber(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Adjuster Name</label>
            <input
              type="text"
              value={adjusterName}
              onChange={e => setAdjusterName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600">Adjuster Phone</label>
              <input
                type="tel"
                value={adjusterPhone}
                onChange={e => setAdjusterPhone(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Adjuster Email</label>
              <input
                type="email"
                value={adjusterEmail}
                onChange={e => setAdjusterEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </fieldset>

      {/* Resolution Notes (only when editing) */}
      {isEditing && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Resolution Notes</label>
          <textarea
            value={resolutionNotes}
            onChange={e => setResolutionNotes(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Notes about claim resolution..."
          />
        </div>
      )}

      {/* Status Transitions */}
      {isEditing && availableTransitions.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2 text-sm font-medium text-gray-700">Status Actions</p>
          <div className="flex flex-wrap gap-2">
            {availableTransitions.map(status => (
              <button
                key={status}
                type="button"
                disabled={isPending}
                onClick={() => handleStatusTransition(status)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Move to {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : isEditing ? 'Update Claim' : 'Create Claim'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
