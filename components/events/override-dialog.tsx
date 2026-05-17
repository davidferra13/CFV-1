'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AccessibleDialog } from '@/components/ui/accessible-dialog'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { overrideGate } from '@/lib/events/readiness'
import { getOverrideCountLast90Days } from '@/lib/events/override-history'
import { OVERRIDE_CATEGORIES } from '@/lib/events/override-taxonomy'
import type { OverrideCategory } from '@/lib/events/override-taxonomy'
import type { GateResult, ReadinessGate } from '@/lib/events/readiness'

interface OverrideDialogProps {
  open: boolean
  onClose: () => void
  eventId: string
  gate: GateResult
  /** Event date (ISO string) for time-pressure detection */
  eventDate?: string | null
}

export function OverrideDialog({ open, onClose, eventId, gate, eventDate }: OverrideDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [category, setCategory] = useState<OverrideCategory | ''>('')
  const [reason, setReason] = useState('')
  const [overrideCount, setOverrideCount] = useState<number | null>(null)

  const isUnderTimePressure = (() => {
    if (!eventDate) return false
    const eventTime = new Date(eventDate).getTime()
    const now = Date.now()
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000
    return eventTime - now < threeDaysMs && eventTime > now
  })()

  // Fetch override count when dialog opens
  useEffect(() => {
    if (!open) return
    setOverrideCount(null)
    getOverrideCountLast90Days(gate.gate as ReadinessGate)
      .then(setOverrideCount)
      .catch(() => {
        setOverrideCount(0)
      })
  }, [open, gate.gate])

  // Reset form state when dialog opens
  useEffect(() => {
    if (open) {
      setCategory('')
      setReason('')
    }
  }, [open])

  function handleSubmit() {
    if (!category) {
      toast.error('Select an override category')
      return
    }
    if (reason.trim().length < 3) {
      toast.error('Provide a brief reason (at least 3 characters)')
      return
    }

    startTransition(async () => {
      try {
        await overrideGate(eventId, gate.gate as ReadinessGate, reason.trim(), category)
        toast.success(`Override recorded for ${gate.label}`)
        onClose()
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to override proof')
      }
    })
  }

  const categoryOptions = OVERRIDE_CATEGORIES.map((cat) => ({
    value: cat.value,
    label: cat.label,
  }))

  const selectedCategoryInfo = OVERRIDE_CATEGORIES.find((c) => c.value === category)

  return (
    <AccessibleDialog
      open={open}
      onClose={onClose}
      title={`Override: ${gate.label}`}
      description="Overriding a readiness gate means accepting responsibility for proceeding without this verification."
      widthClassName="max-w-lg"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSubmit}
            loading={isPending}
            disabled={!category || reason.trim().length < 3}
          >
            Confirm Override
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Time pressure warning */}
        {isUnderTimePressure && (
          <Alert variant="warning" title="Time pressure">
            This override is under time pressure. Consider whether preparation can still be
            completed.
          </Alert>
        )}

        {/* Historical override count */}
        {overrideCount !== null && overrideCount > 0 && (
          <p className="text-sm text-stone-400">
            You have overridden <span className="font-medium text-stone-200">{gate.label}</span>{' '}
            <span className="font-medium text-amber-400">{overrideCount}</span>{' '}
            {overrideCount === 1 ? 'time' : 'times'} in the last 90 days.
          </p>
        )}

        {/* Category picker */}
        <Select
          label="Override Category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value as OverrideCategory | '')}
          options={categoryOptions}
        />
        {selectedCategoryInfo && (
          <p className="text-xs text-stone-500 -mt-2">{selectedCategoryInfo.description}</p>
        )}

        {/* Free-text reason */}
        <div>
          <label
            htmlFor="override-reason"
            className="block text-sm font-medium text-stone-300 mb-1.5"
          >
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="override-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Brief explanation for this override..."
            rows={3}
            className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>
    </AccessibleDialog>
  )
}
