// Subcontract Agreement Form
// Create/edit subcontract agreements with COI management

'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { useProtectedForm } from '@/lib/qol/use-protected-form'
import { FormShield } from '@/components/forms/form-shield'
import { Button } from '@/components/ui/button'
import {
  createSubcontract,
  updateSubcontract,
  updateSubcontractStatus,
  verifyCOI,
  deleteSubcontract,
  type SubcontractAgreement,
} from '@/lib/community/subcontract-actions'

type SubcontractRole =
  | 'sous_chef'
  | 'line_cook'
  | 'prep_cook'
  | 'server'
  | 'bartender'
  | 'pastry'
  | 'lead_chef'
  | 'other'
type SubcontractRateType = 'hourly' | 'flat' | 'percentage'
type SubcontractStatus = 'draft' | 'sent' | 'accepted' | 'active' | 'completed' | 'cancelled'

const ROLE_OPTIONS: { value: SubcontractRole; label: string }[] = [
  { value: 'sous_chef', label: 'Sous Chef' },
  { value: 'line_cook', label: 'Line Cook' },
  { value: 'prep_cook', label: 'Prep Cook' },
  { value: 'server', label: 'Server' },
  { value: 'bartender', label: 'Bartender' },
  { value: 'pastry', label: 'Pastry' },
  { value: 'lead_chef', label: 'Lead Chef' },
  { value: 'other', label: 'Other' },
]

const RATE_TYPE_OPTIONS: { value: SubcontractRateType; label: string }[] = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'flat', label: 'Flat Rate' },
  { value: 'percentage', label: 'Percentage' },
]

const STATUS_TRANSITIONS: Record<SubcontractStatus, { value: SubcontractStatus; label: string }[]> =
  {
    draft: [
      { value: 'sent', label: 'Send to Subcontractor' },
      { value: 'cancelled', label: 'Cancel' },
    ],
    sent: [
      { value: 'accepted', label: 'Mark Accepted' },
      { value: 'cancelled', label: 'Cancel' },
    ],
    accepted: [
      { value: 'active', label: 'Mark Active' },
      { value: 'cancelled', label: 'Cancel' },
    ],
    active: [
      { value: 'completed', label: 'Mark Completed' },
      { value: 'cancelled', label: 'Cancel' },
    ],
    completed: [],
    cancelled: [],
  }

type SubcontractFormProps = {
  agreement?: SubcontractAgreement | null
  eventId?: string
  events?: { id: string; title: string }[]
  onSaved?: () => void
  onCancel?: () => void
}

export function SubcontractForm({
  agreement,
  eventId,
  events,
  onSaved,
  onCancel,
}: SubcontractFormProps) {
  const isEditing = !!agreement

  const [name, setName] = useState(agreement?.subcontractor_name ?? '')
  const [email, setEmail] = useState(agreement?.subcontractor_email ?? '')
  const [phone, setPhone] = useState(agreement?.subcontractor_phone ?? '')
  const [selectedEventId, setSelectedEventId] = useState(agreement?.event_id ?? eventId ?? '')
  const [role, setRole] = useState<SubcontractRole>(
    (agreement?.role as SubcontractRole) ?? 'sous_chef'
  )
  const [rateType, setRateType] = useState<SubcontractRateType>(
    (agreement?.rate_type as SubcontractRateType) ?? 'hourly'
  )
  const [rateDollars, setRateDollars] = useState(
    agreement ? (agreement.rate_cents / 100).toFixed(2) : ''
  )
  const [estimatedHours, setEstimatedHours] = useState(agreement?.estimated_hours?.toString() ?? '')
  const [insuranceRequired, setInsuranceRequired] = useState(agreement?.insurance_required ?? true)
  const [notes, setNotes] = useState(agreement?.notes ?? '')

  // COI fields
  const [coiUrl, setCoiUrl] = useState(agreement?.coi_document_url ?? '')
  const [coiExpiry, setCoiExpiry] = useState(agreement?.coi_expiry_date ?? '')

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const defaultData = useMemo(
    () => ({
      name: agreement?.subcontractor_name ?? '',
      email: agreement?.subcontractor_email ?? '',
      phone: agreement?.subcontractor_phone ?? '',
      selectedEventId: agreement?.event_id ?? eventId ?? '',
      role: (agreement?.role ?? 'sous_chef') as SubcontractRole,
      rateType: (agreement?.rate_type ?? 'hourly') as SubcontractRateType,
      rateDollars: agreement ? (agreement.rate_cents / 100).toFixed(2) : '',
      estimatedHours: agreement?.estimated_hours?.toString() ?? '',
      insuranceRequired: agreement?.insurance_required ?? true,
      notes: agreement?.notes ?? '',
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [agreement?.id]
  )

  const currentData = useMemo(
    () => ({
      name,
      email,
      phone,
      selectedEventId,
      role,
      rateType,
      rateDollars,
      estimatedHours,
      insuranceRequired,
      notes,
    }),
    [
      name,
      email,
      phone,
      selectedEventId,
      role,
      rateType,
      rateDollars,
      estimatedHours,
      insuranceRequired,
      notes,
    ]
  )

  const protection = useProtectedForm({
    surfaceId: 'subcontract-form',
    recordId: agreement?.id ?? null,
    tenantId: 'local',
    defaultData,
    currentData,
  })

  const applyFormData = useCallback((d: typeof defaultData) => {
    setName(d.name)
    setEmail(d.email ?? '')
    setPhone(d.phone ?? '')
    setSelectedEventId(d.selectedEventId)
    setRole(d.role)
    setRateType(d.rateType)
    setRateDollars(d.rateDollars)
    setEstimatedHours(d.estimatedHours)
    setInsuranceRequired(d.insuranceRequired)
    setNotes(d.notes ?? '')
  }, [])

  function handleSave() {
    if (!name.trim()) {
      setError('Subcontractor name is required')
      return
    }

    const rateCents = Math.round(parseFloat(rateDollars || '0') * 100)
    if (isNaN(rateCents) || rateCents < 0) {
      setError('Please enter a valid rate amount')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const payload = {
          subcontractor_name: name.trim(),
          subcontractor_email: email.trim() || null,
          subcontractor_phone: phone.trim() || null,
          event_id: selectedEventId || null,
          role,
          rate_type: rateType,
          rate_cents: rateCents,
          estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
          insurance_required: insuranceRequired,
          notes: notes.trim() || null,
        }

        if (isEditing) {
          await updateSubcontract(agreement.id, payload)
        } else {
          await createSubcontract(payload)
        }
        protection.markCommitted()
        onSaved?.()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save agreement'
        setError(message)
      }
    })
  }

  function handleStatusTransition(newStatus: SubcontractStatus) {
    if (!agreement) return
    startTransition(async () => {
      try {
        await updateSubcontractStatus(agreement.id, newStatus)
        onSaved?.()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update status'
        setError(message)
      }
    })
  }

  function handleVerifyCOI() {
    if (!agreement) return
    if (!coiUrl.trim()) {
      setError('COI document URL is required')
      return
    }
    if (!coiExpiry) {
      setError('COI expiry date is required')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await verifyCOI(agreement.id, coiUrl.trim(), coiExpiry)
        onSaved?.()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to verify COI'
        setError(message)
      }
    })
  }

  function handleDelete() {
    if (!agreement) return
    if (!confirm('Delete this draft agreement?')) return
    startTransition(async () => {
      try {
        await deleteSubcontract(agreement.id)
        onSaved?.()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete agreement'
        setError(message)
      }
    })
  }

  const inputClass =
    'w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500'
  const labelClass = 'block text-sm font-medium text-stone-700 mb-1'

  return (
    <FormShield
      guard={protection.guard}
      showRestorePrompt={protection.showRestorePrompt}
      lastSavedAt={protection.lastSavedAt}
      onRestore={() => {
        const d = protection.restoreDraft()
        if (d) applyFormData(d)
      }}
      onDiscard={protection.discardDraft}
    >
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-stone-900">
          {isEditing ? 'Edit Agreement' : 'New Subcontract Agreement'}
        </h3>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Subcontractor details */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-stone-800">Subcontractor Details</legend>
          <div>
            <label className={labelClass}>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Full name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </fieldset>

        {/* Assignment */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-stone-800">Assignment</legend>
          {events && events.length > 0 && (
            <div>
              <label className={labelClass}>Event</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className={inputClass}
              >
                <option value="">No event linked</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={labelClass}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as SubcontractRole)}
              className={inputClass}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </fieldset>

        {/* Rate */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-stone-800">Compensation</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Rate Type</label>
              <select
                value={rateType}
                onChange={(e) => setRateType(e.target.value as SubcontractRateType)}
                className={inputClass}
              >
                {RATE_TYPE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                {rateType === 'percentage' ? 'Percentage' : 'Amount ($)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={rateDollars}
                onChange={(e) => setRateDollars(e.target.value)}
                className={inputClass}
                placeholder={rateType === 'percentage' ? '10' : '0.00'}
              />
            </div>
          </div>
          {rateType === 'hourly' && (
            <div>
              <label className={labelClass}>Estimated Hours</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className={inputClass}
                placeholder="8"
              />
            </div>
          )}
        </fieldset>

        {/* Insurance / COI */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-stone-800">Insurance & COI</legend>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={insuranceRequired}
              onChange={(e) => setInsuranceRequired(e.target.checked)}
              className="rounded border-stone-300"
            />
            <span className="text-sm text-stone-700">Insurance required</span>
          </label>

          {insuranceRequired && (
            <div className="space-y-4 rounded-md border border-stone-200 bg-stone-50 p-4">
              <div>
                <label className={labelClass}>COI Document URL</label>
                <input
                  type="url"
                  value={coiUrl}
                  onChange={(e) => setCoiUrl(e.target.value)}
                  className={inputClass}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className={labelClass}>COI Expiry Date</label>
                <input
                  type="date"
                  value={coiExpiry}
                  onChange={(e) => setCoiExpiry(e.target.value)}
                  className={inputClass}
                />
              </div>
              {isEditing && (
                <Button
                  variant="secondary"
                  onClick={handleVerifyCOI}
                  disabled={isPending || !coiUrl.trim() || !coiExpiry}
                >
                  {agreement?.coi_verified ? 'Update COI Verification' : 'Verify COI'}
                </Button>
              )}
            </div>
          )}
        </fieldset>

        {/* Notes */}
        <div>
          <label className={labelClass}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
            rows={3}
            placeholder="Any additional notes about this agreement..."
          />
        </div>

        {/* Status transitions (edit mode only) */}
        {isEditing && STATUS_TRANSITIONS[agreement.status as SubcontractStatus]?.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-stone-800">Status Actions</legend>
            <div className="flex gap-2">
              {STATUS_TRANSITIONS[agreement.status as SubcontractStatus].map((t) => (
                <Button
                  key={t.value}
                  variant={t.value === 'cancelled' ? 'danger' : 'secondary'}
                  onClick={() => handleStatusTransition(t.value)}
                  disabled={isPending}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </fieldset>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 border-t border-stone-200 pt-4">
          <Button variant="primary" onClick={handleSave} loading={isPending}>
            {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Agreement'}
          </Button>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
          )}
          {isEditing && agreement.status === 'draft' && (
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={isPending}
              className="ml-auto"
            >
              Delete Draft
            </Button>
          )}
        </div>
      </div>
    </FormShield>
  )
}
