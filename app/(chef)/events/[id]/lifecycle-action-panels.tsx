'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AccessibleDialog } from '@/components/ui/accessible-dialog'
import { ConfirmModal } from '@/components/ui/confirm-modal'

// Server actions
import { rescheduleEventWithFee } from '@/lib/events/reschedule-actions'
import { cancelEvent } from '@/lib/events/cancel-actions'
import {
  getEventCancellationPreview,
  type CancellationPreview,
} from '@/lib/events/cancellation-actions'
import {
  getClauses,
  createClause,
  updateClause,
  deleteClause,
} from '@/lib/contracts/clause-actions'
import type { ClauseCategory } from '@/lib/contracts/default-clauses'
import { sendDietaryOutreach, getDietaryOutreachStatus } from '@/lib/dietary-outreach/actions'
import type { GuestOutreachInfo } from '@/lib/dietary-outreach/types'
import {
  getEventBeverageDiscovery,
  updateBeverageDiscovery,
  type BeverageDiscoveryData,
  type BeverageDiscoveryInput,
} from '@/lib/events/beverage-discovery-actions'
import {
  getDepartureChecklist,
  seedDepartureDefaults,
  toggleDepartureItem,
  addDepartureChecklistItem,
} from '@/lib/events/departure-actions'
import type { DepartureChecklistItem } from '@/lib/events/departure-types'
import {
  getLeftovers,
  addLeftover,
  removeLeftover,
  markLeftoverLabeled,
} from '@/lib/events/leftover-actions'
import type { EventLeftover } from '@/lib/events/departure-types'

// ── RescheduleButton ────────────────────────────────────────────────────────

function RescheduleButton({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [newDate, setNewDate] = useState('')
  const [reason, setReason] = useState('')
  const [initiatedBy, setInitiatedBy] = useState<'chef' | 'client'>('client')
  const [waiveFee, setWaiveFee] = useState(false)

  const handleReschedule = useCallback(() => {
    if (!newDate) {
      toast.error('Please select a new date')
      return
    }
    startTransition(async () => {
      try {
        const result = await rescheduleEventWithFee(eventId, {
          newDate,
          reason: reason || undefined,
          initiatedBy,
          waiveFee,
        })
        if (result.success) {
          const feeMsg = result.fee_waived
            ? ' (fee waived)'
            : result.fee_cents
              ? ` (fee: $${(result.fee_cents / 100).toFixed(2)})`
              : ''
          toast.success(`Event rescheduled to ${newDate}${feeMsg}`)
          setOpen(false)
          setNewDate('')
          setReason('')
        } else {
          toast.error(result.error || 'Failed to reschedule')
        }
      } catch (err: any) {
        toast.error(err.message || 'Reschedule failed')
      }
    })
  }, [eventId, newDate, reason, initiatedBy, waiveFee, startTransition])

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Reschedule
      </Button>
      <AccessibleDialog
        open={open}
        title="Reschedule Event"
        description="Choose a new date for this event. Applicable fees will be calculated automatically."
        onClose={() => !isPending && setOpen(false)}
        escapeCloses={!isPending}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleReschedule}
              loading={isPending}
              disabled={isPending || !newDate}
            >
              Reschedule
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm text-stone-300">New Date</span>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-sm text-stone-300">Reason (optional)</span>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Client schedule conflict"
              className="mt-1 block w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-sm text-stone-300">Initiated By</span>
            <select
              value={initiatedBy}
              onChange={(e) => setInitiatedBy(e.target.value as 'chef' | 'client')}
              className="mt-1 block w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
            >
              <option value="client">Client</option>
              <option value="chef">Chef</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-300">
            <input
              type="checkbox"
              checked={waiveFee}
              onChange={(e) => setWaiveFee(e.target.checked)}
              className="rounded border-stone-600 bg-stone-800"
            />
            Waive reschedule fee
          </label>
        </div>
      </AccessibleDialog>
    </>
  )
}

// ── CancelButton ────────────────────────────────────────────────────────────

function CancelButton({ eventId }: { eventId: string }) {
  const [showPreview, setShowPreview] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [preview, setPreview] = useState<CancellationPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [reason, setReason] = useState('')
  const [initiatedBy, setInitiatedBy] = useState<'chef' | 'client' | 'mutual'>('client')

  const loadPreview = useCallback(async () => {
    setPreviewLoading(true)
    try {
      const result = await getEventCancellationPreview(eventId)
      if (result.error || !result.data) {
        toast.error(result.error || 'Failed to load cancellation preview')
        return
      }
      setPreview(result.data)
      setShowPreview(true)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load preview')
    } finally {
      setPreviewLoading(false)
    }
  }, [eventId])

  const handleCancel = useCallback(() => {
    if (!reason.trim()) {
      toast.error('Please provide a cancellation reason')
      return
    }
    setShowPreview(false)
    setShowConfirm(true)
  }, [reason])

  const confirmCancel = useCallback(() => {
    startTransition(async () => {
      try {
        const result = await cancelEvent(eventId, {
          reason,
          initiatedBy,
        })
        if (result.success) {
          const feeMsg = result.cancellation_fee_cents
            ? ` Fee retained: $${(result.cancellation_fee_cents / 100).toFixed(2)}`
            : ''
          toast.success(`Event cancelled.${feeMsg}`)
          setShowConfirm(false)
          setReason('')
        } else {
          toast.error(result.error || 'Failed to cancel event')
        }
      } catch (err: any) {
        toast.error(err.message || 'Cancellation failed')
      }
    })
  }, [eventId, reason, initiatedBy, startTransition])

  return (
    <>
      <Button variant="danger" size="sm" onClick={loadPreview} loading={previewLoading}>
        Cancel Event
      </Button>

      {/* Fee preview dialog */}
      <AccessibleDialog
        open={showPreview}
        title="Cancel Event"
        description="Review the cancellation terms before proceeding."
        onClose={() => setShowPreview(false)}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
              Go Back
            </Button>
            <Button variant="danger" size="sm" onClick={handleCancel} disabled={!reason.trim()}>
              Proceed to Cancel
            </Button>
          </>
        }
      >
        {preview && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-stone-600/50 bg-stone-800/50 p-3 space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-400">Days until event</span>
                <span className="text-stone-200">{preview.daysUntilEvent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Policy</span>
                <span className="text-stone-200">{preview.policyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Tier</span>
                <span className="text-stone-200">{preview.applicableTier.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">
                  Refund ({preview.applicableTier.refund_percent}%)
                </span>
                <span className="text-stone-200">
                  ${(preview.refundAmountCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-stone-300">Fee retained</span>
                <span className="text-red-400">${(preview.feeRetainedCents / 100).toFixed(2)}</span>
              </div>
              {preview.gracePeriodApplies && (
                <p className="text-xs text-green-400 mt-1">
                  Grace period applies: full refund available
                </p>
              )}
            </div>
            <label className="block">
              <span className="text-stone-300">Reason for cancellation</span>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Client requested cancellation"
                className="mt-1 block w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-stone-300">Initiated by</span>
              <select
                value={initiatedBy}
                onChange={(e) => setInitiatedBy(e.target.value as 'chef' | 'client' | 'mutual')}
                className="mt-1 block w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
              >
                <option value="client">Client</option>
                <option value="chef">Chef</option>
                <option value="mutual">Mutual</option>
              </select>
            </label>
          </div>
        )}
      </AccessibleDialog>

      {/* Final confirmation */}
      <ConfirmModal
        open={showConfirm}
        title="Confirm Cancellation"
        description={`This will permanently cancel the event and notify all parties. ${preview?.feeRetainedCents ? `A fee of $${(preview.feeRetainedCents / 100).toFixed(2)} will be retained.` : ''}`}
        confirmLabel="Cancel Event"
        variant="danger"
        loading={isPending}
        onConfirm={confirmCancel}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}

// ── ContractClausePanel ─────────────────────────────────────────────────────

type ClauseRow = {
  id: string
  slug: string
  title: string
  body: string
  category: string
  is_default: boolean
  sort_order: number
}

function ContractClausePanel({ eventId }: { eventId: string }) {
  const [clauses, setClauses] = useState<ClauseRow[]>([])
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Add/Edit form
  const [formTitle, setFormTitle] = useState('')
  const [formBody, setFormBody] = useState('')
  const [formCategory, setFormCategory] = useState<ClauseCategory>('scope')
  const [formSlug, setFormSlug] = useState('')

  const loadClauses = useCallback(() => {
    startTransition(async () => {
      try {
        const result = await getClauses()
        if (result.success && result.data) {
          setClauses(result.data)
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to load clauses')
      } finally {
        setLoaded(true)
      }
    })
  }, [startTransition])

  useEffect(() => {
    loadClauses()
  }, [loadClauses])

  const resetForm = useCallback(() => {
    setFormTitle('')
    setFormBody('')
    setFormCategory('scope')
    setFormSlug('')
    setEditingId(null)
    setShowAdd(false)
  }, [])

  const handleSave = useCallback(() => {
    if (!formTitle.trim() || !formBody.trim()) {
      toast.error('Title and body are required')
      return
    }
    startTransition(async () => {
      try {
        if (editingId) {
          const result = await updateClause({
            id: editingId,
            title: formTitle,
            body: formBody,
            category: formCategory,
            slug: formSlug || formTitle.toLowerCase().replace(/\s+/g, '-'),
          })
          if (!result.success) {
            toast.error(result.error || 'Failed to update clause')
            return
          }
          toast.success('Clause updated')
        } else {
          const result = await createClause({
            title: formTitle,
            body: formBody,
            category: formCategory,
            slug: formSlug || formTitle.toLowerCase().replace(/\s+/g, '-'),
          })
          if (!result.success) {
            toast.error(result.error || 'Failed to create clause')
            return
          }
          toast.success('Clause added')
        }
        resetForm()
        loadClauses()
      } catch (err: any) {
        toast.error(err.message || 'Save failed')
      }
    })
  }, [
    editingId,
    formTitle,
    formBody,
    formCategory,
    formSlug,
    resetForm,
    loadClauses,
    startTransition,
  ])

  const handleEdit = useCallback((clause: ClauseRow) => {
    setEditingId(clause.id)
    setFormTitle(clause.title)
    setFormBody(clause.body)
    setFormCategory(clause.category as ClauseCategory)
    setFormSlug(clause.slug)
    setShowAdd(true)
  }, [])

  const handleDelete = useCallback(
    (id: string) => {
      startTransition(async () => {
        try {
          const result = await deleteClause(id)
          if (!result.success) {
            toast.error(result.error || 'Failed to delete clause')
            return
          }
          toast.success('Clause removed')
          loadClauses()
        } catch (err: any) {
          toast.error(err.message || 'Delete failed')
        }
      })
    },
    [loadClauses, startTransition]
  )

  const categories: ClauseCategory[] = [
    'cancellation',
    'reschedule',
    'liability',
    'kitchen',
    'ip',
    'confidentiality',
    'force_majeure',
    'dispute',
    'payment',
    'scope',
    'custom',
  ]

  if (!loaded && isPending) {
    return (
      <Card className="p-4">
        <p className="text-sm text-stone-400">Loading clauses...</p>
      </Card>
    )
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-200">Contract Clauses</h3>
        <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)}>
          Add Clause
        </Button>
      </div>

      {clauses.length === 0 && loaded && (
        <p className="text-xs text-stone-500">No clauses yet. Add one to get started.</p>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {clauses.map((clause) => (
          <div
            key={clause.id}
            className="rounded-lg border border-stone-700/40 bg-stone-800/50 p-3 space-y-1"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-stone-200">{clause.title}</p>
                <p className="text-xs text-stone-400 capitalize">
                  {clause.category.replace('_', ' ')}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(clause)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(clause.id)}
                  disabled={isPending}
                >
                  Remove
                </Button>
              </div>
            </div>
            <p className="text-xs text-stone-400 line-clamp-2">{clause.body}</p>
          </div>
        ))}
      </div>

      {/* Add/Edit dialog */}
      <AccessibleDialog
        open={showAdd}
        title={editingId ? 'Edit Clause' : 'Add Clause'}
        onClose={() => !isPending && resetForm()}
        escapeCloses={!isPending}
        widthClassName="max-w-lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={resetForm} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              loading={isPending}
              disabled={isPending || !formTitle.trim() || !formBody.trim()}
            >
              {editingId ? 'Update' : 'Add'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm text-stone-300">Title</span>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Clause title"
              className="mt-1 block w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-sm text-stone-300">Category</span>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as ClauseCategory)}
              className="mt-1 block w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-stone-300">Body</span>
            <textarea
              value={formBody}
              onChange={(e) => setFormBody(e.target.value)}
              rows={5}
              placeholder="Clause text..."
              className="mt-1 block w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none resize-y"
            />
          </label>
        </div>
      </AccessibleDialog>
    </Card>
  )
}

// ── DietaryOutreachButton ───────────────────────────────────────────────────

function DietaryOutreachButton({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition()
  const [showStatus, setShowStatus] = useState(false)
  const [guests, setGuests] = useState<GuestOutreachInfo[]>([])
  const [statusLoading, setStatusLoading] = useState(false)

  const handleSend = useCallback(() => {
    startTransition(async () => {
      try {
        const result = await sendDietaryOutreach(eventId)
        if (result.success) {
          toast.success(`Dietary forms sent to ${result.sent} guest(s). ${result.skipped} skipped.`)
        } else {
          toast.error(result.error || 'Failed to send dietary outreach')
        }
      } catch (err: any) {
        toast.error(err.message || 'Outreach failed')
      }
    })
  }, [eventId, startTransition])

  const loadStatus = useCallback(async () => {
    setStatusLoading(true)
    try {
      const result = await getDietaryOutreachStatus(eventId)
      if (result.success) {
        setGuests(result.guests)
        setShowStatus(true)
      } else {
        toast.error(result.error || 'Failed to load outreach status')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load status')
    } finally {
      setStatusLoading(false)
    }
  }, [eventId])

  const statusColors: Record<string, string> = {
    not_sent: 'text-stone-500',
    sent: 'text-amber-400',
    opened: 'text-blue-400',
    responded: 'text-green-400',
    expired: 'text-red-400',
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={handleSend} loading={isPending}>
          Send Dietary Forms
        </Button>
        <Button variant="ghost" size="sm" onClick={loadStatus} loading={statusLoading}>
          View Status
        </Button>
      </div>

      <AccessibleDialog
        open={showStatus}
        title="Dietary Outreach Status"
        onClose={() => setShowStatus(false)}
        widthClassName="max-w-lg"
        footer={
          <Button variant="ghost" size="sm" onClick={() => setShowStatus(false)}>
            Close
          </Button>
        }
      >
        {guests.length === 0 ? (
          <p className="text-sm text-stone-400">No guests found for this event.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {guests.map((g) => (
              <div
                key={g.guest_id}
                className="flex items-center justify-between rounded-lg border border-stone-700/40 bg-stone-800/50 p-2"
              >
                <div>
                  <p className="text-sm text-stone-200">{g.guest_name}</p>
                  <p className="text-xs text-stone-500">{g.email || 'No email'}</p>
                </div>
                <span
                  className={`text-xs font-medium capitalize ${statusColors[g.status] || 'text-stone-400'}`}
                >
                  {g.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </AccessibleDialog>
    </>
  )
}

// ── BeverageDiscoveryPanel ──────────────────────────────────────────────────

function BeverageDiscoveryPanel({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)
  const [data, setData] = useState<BeverageDiscoveryData | null>(null)

  // Form state
  const [expectations, setExpectations] = useState('')
  const [serviceType, setServiceType] = useState<string>('tbd')
  const [alcoholServed, setAlcoholServed] = useState(false)

  const serviceTypeOptions = [
    { value: 'chef_provides', label: 'Chef provides' },
    { value: 'client_provides', label: 'Client provides' },
    { value: 'byob', label: 'BYOB' },
    { value: 'no_alcohol', label: 'No alcohol' },
    { value: 'tbd', label: 'TBD' },
  ]

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const result = await getEventBeverageDiscovery(eventId)
        if (!cancelled && result) {
          setData(result)
          setExpectations(result.beverage_expectations || '')
          setServiceType(result.beverage_service_type || 'tbd')
          setAlcoholServed(result.alcohol_being_served)
        }
      } catch {
        // silently fail on load
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [eventId])

  const handleSave = useCallback(() => {
    startTransition(async () => {
      try {
        const input: BeverageDiscoveryInput = {
          beverage_expectations: expectations || null,
          beverage_service_type:
            (serviceType as BeverageDiscoveryInput['beverage_service_type']) || null,
          alcohol_being_served: alcoholServed,
        }
        const result = await updateBeverageDiscovery(eventId, input)
        if (result.success) {
          toast.success('Beverage preferences saved')
        } else {
          toast.error(result.error || 'Failed to save beverage preferences')
        }
      } catch (err: any) {
        toast.error(err.message || 'Save failed')
      }
    })
  }, [eventId, expectations, serviceType, alcoholServed, startTransition])

  if (!loaded) {
    return (
      <Card className="p-4">
        <p className="text-sm text-stone-400">Loading beverage info...</p>
      </Card>
    )
  }

  return (
    <Card className="p-4 space-y-3">
      <h3 className="text-sm font-semibold text-stone-200">Beverage Discovery</h3>

      <label className="block">
        <span className="text-xs text-stone-400">Service Type</span>
        <select
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
        >
          {serviceTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-stone-300">
        <input
          type="checkbox"
          checked={alcoholServed}
          onChange={(e) => setAlcoholServed(e.target.checked)}
          className="rounded border-stone-600 bg-stone-800"
        />
        Alcohol being served
      </label>

      <label className="block">
        <span className="text-xs text-stone-400">Expectations / Notes</span>
        <textarea
          value={expectations}
          onChange={(e) => setExpectations(e.target.value)}
          rows={3}
          placeholder="Client beverage expectations, pairings, special requests..."
          className="mt-1 block w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none resize-y"
        />
      </label>

      <Button variant="primary" size="sm" onClick={handleSave} loading={isPending}>
        Save Beverage Info
      </Button>
    </Card>
  )
}

// ── DepartureLeftoverPanel ──────────────────────────────────────────────────

function DepartureLeftoverPanel({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition()
  const [checklistItems, setChecklistItems] = useState<DepartureChecklistItem[]>([])
  const [leftovers, setLeftovers] = useState<EventLeftover[]>([])
  const [loaded, setLoaded] = useState(false)
  const [newChecklistLabel, setNewChecklistLabel] = useState('')
  const [showAddLeftover, setShowAddLeftover] = useState(false)

  // Leftover form
  const [loDescription, setLoDescription] = useState('')
  const [loQuantity, setLoQuantity] = useState('')
  const [loPackaging, setLoPackaging] = useState<string>('')
  const [loGivenTo, setLoGivenTo] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [checklistResult, leftoverResult] = await Promise.all([
        getDepartureChecklist(eventId),
        getLeftovers(eventId),
      ])
      if (checklistResult.success) setChecklistItems(checklistResult.data)
      if (leftoverResult.success) setLeftovers(leftoverResult.data)
    } catch {
      toast.error('Failed to load departure data')
    } finally {
      setLoaded(true)
    }
  }, [eventId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSeedDefaults = useCallback(() => {
    startTransition(async () => {
      try {
        const result = await seedDepartureDefaults(eventId)
        if (result.success) {
          toast.success(`Added ${result.count} default checklist items`)
          loadData()
        } else {
          toast.error(result.error || 'Failed to seed defaults')
        }
      } catch (err: any) {
        toast.error(err.message || 'Seed failed')
      }
    })
  }, [eventId, loadData, startTransition])

  const handleToggle = useCallback(
    (itemId: string) => {
      startTransition(async () => {
        try {
          const result = await toggleDepartureItem(itemId, eventId)
          if (result.success) {
            loadData()
          } else {
            toast.error(result.error || 'Failed to toggle item')
          }
        } catch (err: any) {
          toast.error(err.message || 'Toggle failed')
        }
      })
    },
    [eventId, loadData, startTransition]
  )

  const handleAddChecklistItem = useCallback(() => {
    if (!newChecklistLabel.trim()) return
    startTransition(async () => {
      try {
        const result = await addDepartureChecklistItem(eventId, newChecklistLabel.trim())
        if (result.success) {
          toast.success('Item added')
          setNewChecklistLabel('')
          loadData()
        } else {
          toast.error(result.error || 'Failed to add item')
        }
      } catch (err: any) {
        toast.error(err.message || 'Add failed')
      }
    })
  }, [eventId, newChecklistLabel, loadData, startTransition])

  const handleAddLeftover = useCallback(() => {
    if (!loDescription.trim()) {
      toast.error('Description is required')
      return
    }
    startTransition(async () => {
      try {
        const result = await addLeftover(eventId, {
          item_description: loDescription,
          quantity: loQuantity || undefined,
          packaging_type: (loPackaging as EventLeftover['packaging_type']) || undefined,
          given_to: loGivenTo || undefined,
        })
        if (result.success) {
          toast.success('Leftover tracked')
          setLoDescription('')
          setLoQuantity('')
          setLoPackaging('')
          setLoGivenTo('')
          setShowAddLeftover(false)
          loadData()
        } else {
          toast.error(result.error || 'Failed to add leftover')
        }
      } catch (err: any) {
        toast.error(err.message || 'Add failed')
      }
    })
  }, [eventId, loDescription, loQuantity, loPackaging, loGivenTo, loadData, startTransition])

  const handleRemoveLeftover = useCallback(
    (id: string) => {
      startTransition(async () => {
        try {
          const result = await removeLeftover(id, eventId)
          if (result.success) {
            toast.success('Leftover removed')
            loadData()
          } else {
            toast.error(result.error || 'Failed to remove')
          }
        } catch (err: any) {
          toast.error(err.message || 'Remove failed')
        }
      })
    },
    [eventId, loadData, startTransition]
  )

  const handleLabelLeftover = useCallback(
    (id: string, currentLabel: string) => {
      const labelText = window.prompt('Label text:', currentLabel || '')
      if (labelText === null) return
      startTransition(async () => {
        try {
          const result = await markLeftoverLabeled(id, eventId, labelText)
          if (result.success) {
            toast.success('Labeled')
            loadData()
          } else {
            toast.error(result.error || 'Failed to label')
          }
        } catch (err: any) {
          toast.error(err.message || 'Label failed')
        }
      })
    },
    [eventId, loadData, startTransition]
  )

  const packagingOptions = [
    { value: '', label: 'Select...' },
    { value: 'container', label: 'Container' },
    { value: 'wrapped', label: 'Wrapped' },
    { value: 'bag', label: 'Bag' },
    { value: 'box', label: 'Box' },
    { value: 'other', label: 'Other' },
  ]

  if (!loaded) {
    return (
      <Card className="p-4">
        <p className="text-sm text-stone-400">Loading departure data...</p>
      </Card>
    )
  }

  return (
    <Card className="p-4 space-y-4">
      {/* Departure Checklist */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-200">Departure Checklist</h3>
          {checklistItems.length === 0 && (
            <Button variant="secondary" size="sm" onClick={handleSeedDefaults} loading={isPending}>
              Load Defaults
            </Button>
          )}
        </div>

        {checklistItems.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => handleToggle(item.id)}
              disabled={isPending}
              className="rounded border-stone-600 bg-stone-800"
            />
            <span className={item.checked ? 'line-through text-stone-500' : ''}>{item.label}</span>
          </label>
        ))}

        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={newChecklistLabel}
            onChange={(e) => setNewChecklistLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
            placeholder="Add checklist item..."
            className="flex-1 rounded-lg border border-stone-600 bg-stone-800 px-3 py-1.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddChecklistItem}
            disabled={isPending || !newChecklistLabel.trim()}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-stone-700/40" />

      {/* Leftover Tracking */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-200">Leftover Tracking</h3>
          <Button variant="secondary" size="sm" onClick={() => setShowAddLeftover(true)}>
            Track Leftover
          </Button>
        </div>

        {leftovers.length === 0 && (
          <p className="text-xs text-stone-500">No leftovers tracked yet.</p>
        )}

        {leftovers.map((lo) => (
          <div
            key={lo.id}
            className="rounded-lg border border-stone-700/40 bg-stone-800/50 p-2 space-y-1"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-stone-200">{lo.item_description}</p>
                <div className="flex flex-wrap gap-2 text-xs text-stone-400">
                  {lo.quantity && <span>Qty: {lo.quantity}</span>}
                  {lo.packaging_type && <span>Pkg: {lo.packaging_type}</span>}
                  {lo.given_to && <span>Given to: {lo.given_to}</span>}
                  {lo.labeled && (
                    <span className="text-green-400">
                      Labeled{lo.label_text ? `: ${lo.label_text}` : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {!lo.labeled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLabelLeftover(lo.id, lo.label_text || '')}
                    disabled={isPending}
                  >
                    Label
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveLeftover(lo.id)}
                  disabled={isPending}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add leftover dialog */}
      <AccessibleDialog
        open={showAddLeftover}
        title="Track Leftover"
        onClose={() => !isPending && setShowAddLeftover(false)}
        escapeCloses={!isPending}
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddLeftover(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddLeftover}
              loading={isPending}
              disabled={isPending || !loDescription.trim()}
            >
              Track
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm text-stone-300">Item Description</span>
            <input
              type="text"
              value={loDescription}
              onChange={(e) => setLoDescription(e.target.value)}
              placeholder="e.g. Braised short ribs"
              className="mt-1 block w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-sm text-stone-300">Quantity</span>
            <input
              type="text"
              value={loQuantity}
              onChange={(e) => setLoQuantity(e.target.value)}
              placeholder="e.g. 2 containers"
              className="mt-1 block w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-sm text-stone-300">Packaging</span>
            <select
              value={loPackaging}
              onChange={(e) => setLoPackaging(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
            >
              {packagingOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-stone-300">Given To</span>
            <input
              type="text"
              value={loGivenTo}
              onChange={(e) => setLoGivenTo(e.target.value)}
              placeholder="e.g. Client, staff, composted"
              className="mt-1 block w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
            />
          </label>
        </div>
      </AccessibleDialog>
    </Card>
  )
}

// ── LifecycleActionPanels (composite) ───────────────────────────────────────

type LifecycleActionPanelsProps = {
  eventId: string
  eventStatus?: string
}

const ACTIVE_STATUSES = new Set([
  'draft',
  'proposed',
  'accepted',
  'paid',
  'confirmed',
  'in_progress',
])
const POST_SERVICE_STATUSES = new Set(['completed', 'in_progress'])

export function LifecycleActionPanels({ eventId, eventStatus }: LifecycleActionPanelsProps) {
  const status = eventStatus || 'draft'
  const isActive = ACTIVE_STATUSES.has(status)
  const isPostService = POST_SERVICE_STATUSES.has(status)
  const isCancelled = status === 'cancelled'

  if (isCancelled) {
    return (
      <Card className="p-4">
        <p className="text-sm text-stone-500">
          This event has been cancelled. No lifecycle actions available.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Reschedule and Cancel: available for active events */}
      {isActive && (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-stone-200">Event Actions</h3>
          <div className="flex flex-wrap gap-2">
            <RescheduleButton eventId={eventId} />
            <CancelButton eventId={eventId} />
            <DietaryOutreachButton eventId={eventId} />
          </div>
        </Card>
      )}

      {/* Contract clauses: always visible for non-cancelled */}
      <ContractClausePanel eventId={eventId} />

      {/* Beverage discovery: visible for active events */}
      {isActive && <BeverageDiscoveryPanel eventId={eventId} />}

      {/* Departure + Leftover: primarily post-service, but also visible during event */}
      {(isActive || isPostService) && <DepartureLeftoverPanel eventId={eventId} />}
    </div>
  )
}
