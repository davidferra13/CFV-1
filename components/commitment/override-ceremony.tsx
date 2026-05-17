'use client'

import { useState, useEffect, useCallback } from 'react'
import { AccessibleDialog } from '@/components/ui/accessible-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Select } from '@/components/ui/select'
import {
  OVERRIDE_CATEGORY_LABELS,
  DOMAIN_LABELS,
  type Commitment,
  type FrictionTier,
  type OverrideCategory,
} from '@/lib/commitment/types'

interface OverrideCeremonyProps {
  commitment: Commitment
  ruleDescription: string
  frictionTier: FrictionTier
  streakAtRisk: number | null
  overridesInWindow: { last30: number; last60: number; last90: number }
  onOverride: (data: {
    category: OverrideCategory
    reason: string
    regretPrediction?: number
  }) => void
  onCancel: () => void
  open: boolean
}

const CATEGORY_OPTIONS = Object.entries(OVERRIDE_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const COUNTDOWN_SECONDS: Record<FrictionTier, number> = {
  1: 0,
  2: 10,
  3: 0,
  4: 0,
  5: 30,
}

export function OverrideCeremony({
  commitment,
  ruleDescription,
  frictionTier,
  streakAtRisk,
  overridesInWindow,
  onOverride,
  onCancel,
  open,
}: OverrideCeremonyProps) {
  const [category, setCategory] = useState<OverrideCategory | null>(null)
  const [reason, setReason] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS[frictionTier])

  useEffect(() => {
    if (!open) {
      setCategory(null)
      setReason('')
      setAcknowledged(false)
      setCountdown(COUNTDOWN_SECONDS[frictionTier])
      return
    }
    setCountdown(COUNTDOWN_SECONDS[frictionTier])
  }, [open, frictionTier])

  useEffect(() => {
    if (!open || countdown <= 0) return
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [open, countdown > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  const needsCategory = frictionTier >= 3
  const needsAcknowledgment = frictionTier >= 5
  const hasCountdown = COUNTDOWN_SECONDS[frictionTier] > 0

  const canSubmit = useCallback(() => {
    if (hasCountdown && countdown > 0) return false
    if (needsCategory && (!category || !reason.trim())) return false
    if (needsAcknowledgment && !acknowledged) return false
    return true
  }, [hasCountdown, countdown, needsCategory, category, reason, needsAcknowledgment, acknowledged])

  const handleSubmit = () => {
    if (!canSubmit()) return
    onOverride({
      category: category ?? 'other',
      reason: reason.trim() || 'No reason provided',
    })
  }

  // Tier 1: inline banner only (no dialog)
  if (frictionTier === 1) {
    if (!open) return null
    return (
      <Alert variant="warning" title={ruleDescription}>
        <div className="mt-2 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSubmit}>
            Proceed Anyway
          </Button>
        </div>
      </Alert>
    )
  }

  // Tiers 2-5: dialog
  const overrideTotal =
    overridesInWindow.last30 + overridesInWindow.last60 + overridesInWindow.last90

  return (
    <AccessibleDialog
      open={open}
      title={`Override: ${DOMAIN_LABELS[commitment.domain]}`}
      description={ruleDescription}
      onClose={onCancel}
      widthClassName="max-w-lg"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Keep Commitment
          </Button>
          <Button variant="danger" disabled={!canSubmit()} onClick={handleSubmit}>
            {hasCountdown && countdown > 0 ? `Override (${countdown}s)` : 'Override'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Override count (Tier 2+) */}
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">Overrides:</span>
          <Badge variant={overrideTotal > 5 ? 'error' : overrideTotal > 2 ? 'warning' : 'default'}>
            {overridesInWindow.last30} (30d)
          </Badge>
          <Badge variant="default">{overridesInWindow.last60} (60d)</Badge>
          <Badge variant="default">{overridesInWindow.last90} (90d)</Badge>
        </div>

        {/* Category + Reason (Tier 3+) */}
        {needsCategory && (
          <>
            <Select
              label="Why are you overriding?"
              options={CATEGORY_OPTIONS}
              value={category ?? ''}
              onChange={(e) => setCategory(e.target.value as OverrideCategory)}
              required
            />
            <div>
              <label
                htmlFor="override-reason"
                className="block text-sm font-medium text-stone-300 mb-1.5"
              >
                Explain your reasoning
              </label>
              <textarea
                id="override-reason"
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="What makes this override necessary?"
                required
              />
            </div>
          </>
        )}

        {/* Future Self Letter (Tier 4+) */}
        {frictionTier >= 4 && commitment.futureSelfletter && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3">
            <p className="text-xs font-medium text-amber-400 mb-1">Letter from your past self:</p>
            <p className="text-sm text-stone-300 italic">{commitment.futureSelfletter}</p>
          </div>
        )}

        {/* Streak impact (Tier 4+) */}
        {frictionTier >= 4 && streakAtRisk !== null && streakAtRisk > 0 && (
          <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-3 text-sm">
            <span className="text-red-400 font-medium">
              Your {streakAtRisk}-day streak will reset.
            </span>
          </div>
        )}

        {/* Acknowledgment checkbox (Tier 5) */}
        {needsAcknowledgment && (
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 rounded border-stone-600 bg-stone-800 text-brand-500 focus:ring-brand-500/20"
            />
            <span className="text-sm text-stone-300">
              I understand the consequences of overriding this commitment
            </span>
          </label>
        )}
      </div>
    </AccessibleDialog>
  )
}
