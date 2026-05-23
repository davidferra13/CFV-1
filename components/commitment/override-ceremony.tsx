'use client'

import { useState, useEffect, useCallback } from 'react'
import { AccessibleDialog } from '@/components/ui/accessible-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import {
  DOMAIN_LABELS,
  type CommitmentDomain,
  type FrictionTier,
  type OverrideCategory,
} from '@/lib/commitment/types'
import { recordOverrideAction } from '@/lib/commitment/commitment-actions'

// ── Props ───────────────────────────────────────────────────────────────────────

interface OverrideCeremonyProps {
  /** ID of the commitment being overridden */
  commitmentId: string
  /** Human-readable name/description of the commitment */
  commitmentName: string
  /** Commitment domain */
  domain: CommitmentDomain
  /** Current friction tier (1-5), controls ceremony intensity */
  frictionTier: FrictionTier
  /** Total number of prior overrides on this commitment */
  overrideCount: number
  /** Called after a successful override is recorded */
  onConfirm: () => void
  /** Called when the user cancels the ceremony */
  onCancel: () => void
  /** Optional: future-self letter text (displayed at tier 5) */
  futureSelfletter?: string | null
}

// ── Constants ───────────────────────────────────────────────────────────────────

const TIER_2_COUNTDOWN_SECONDS = 10

const TIER_COLORS: Record<FrictionTier, { border: string; bg: string; text: string }> = {
  1: { border: 'border-amber-500/40', bg: 'bg-amber-950/20', text: 'text-amber-400' },
  2: { border: 'border-amber-500/40', bg: 'bg-amber-950/20', text: 'text-amber-400' },
  3: { border: 'border-orange-500/40', bg: 'bg-orange-950/20', text: 'text-orange-400' },
  4: { border: 'border-red-500/40', bg: 'bg-red-950/20', text: 'text-red-400' },
  5: { border: 'border-red-600/50', bg: 'bg-red-950/30', text: 'text-red-400' },
}

const TIER_BADGE_VARIANT: Record<FrictionTier, 'default' | 'warning' | 'error'> = {
  1: 'default',
  2: 'warning',
  3: 'warning',
  4: 'error',
  5: 'error',
}

function overrideCountLabel(count: number): string {
  if (count === 0) return 'First override'
  if (count === 1) return '1 prior override'
  return `${count} prior overrides`
}

// ── Component ───────────────────────────────────────────────────────────────────

export function OverrideCeremony({
  commitmentId,
  commitmentName,
  domain,
  frictionTier,
  overrideCount,
  onConfirm,
  onCancel,
  futureSelfletter,
}: OverrideCeremonyProps) {
  const [reason, setReason] = useState('')
  const [countdown, setCountdown] = useState(frictionTier === 2 ? TIER_2_COUNTDOWN_SECONDS : 0)
  const [extraConfirm, setExtraConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Reset state when tier changes (remount guard)
  useEffect(() => {
    setReason('')
    setExtraConfirm(false)
    setSubmitting(false)
    setCountdown(frictionTier === 2 ? TIER_2_COUNTDOWN_SECONDS : 0)
  }, [frictionTier, commitmentId])

  // Countdown timer for tier 2
  useEffect(() => {
    if (frictionTier !== 2 || countdown <= 0) return
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
  }, [frictionTier, countdown])

  // ── Submission gate ─────────────────────────────────────────────────────────

  const canSubmit = useCallback((): boolean => {
    if (submitting) return false
    // Tier 2: countdown must finish
    if (frictionTier === 2 && countdown > 0) return false
    // Tier 3+: reason required
    if (frictionTier >= 3 && reason.trim().length === 0) return false
    // Tier 5: extra confirmation checkbox required
    if (frictionTier === 5 && !extraConfirm) return false
    return true
  }, [submitting, frictionTier, countdown, reason, extraConfirm])

  // ── Submit handler ──────────────────────────────────────────────────────────

  const handleConfirm = useCallback(async () => {
    if (!canSubmit()) return
    setSubmitting(true)
    try {
      const result = await recordOverrideAction({
        commitmentId,
        reason: reason.trim() || 'Override confirmed',
        frictionTierAtOverride: frictionTier,
      })
      if (!result.success) {
        console.error('[override-ceremony] Failed:', result.error)
        setSubmitting(false)
        return
      }
      onConfirm()
    } catch (err) {
      console.error('[override-ceremony] Unexpected error:', err)
      setSubmitting(false)
    }
  }, [canSubmit, commitmentId, reason, frictionTier, onConfirm])

  const colors = TIER_COLORS[frictionTier]

  // ── Tier 1: Simple warning banner ─────────────────────────────────────────

  if (frictionTier === 1) {
    return (
      <Alert variant="warning" title="Commitment Override">
        <p className="text-sm mb-2">
          You are about to override <strong>{commitmentName}</strong> ({DOMAIN_LABELS[domain]}).
        </p>
        {overrideCount > 0 && (
          <p className="text-xs text-stone-400 mb-3">{overrideCountLabel(overrideCount)}</p>
        )}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Keep Commitment
          </Button>
          <Button variant="secondary" size="sm" onClick={handleConfirm} loading={submitting}>
            Proceed Anyway
          </Button>
        </div>
      </Alert>
    )
  }

  // ── Tiers 2-5: Full dialog ────────────────────────────────────────────────

  const confirmButtonLabel =
    frictionTier === 2 && countdown > 0 ? `Override (${countdown}s)` : 'Override Commitment'

  return (
    <AccessibleDialog
      open
      title={`Override: ${DOMAIN_LABELS[domain]}`}
      description={commitmentName}
      onClose={submitting ? () => {} : onCancel}
      escapeCloses={!submitting}
      widthClassName="max-w-lg"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            Keep Commitment
          </Button>
          <Button
            variant="danger"
            disabled={!canSubmit()}
            onClick={handleConfirm}
            loading={submitting}
          >
            {confirmButtonLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Commitment being overridden */}
        <div className={`rounded-lg border ${colors.border} ${colors.bg} p-3`}>
          <div className="flex items-center justify-between mb-1">
            <Badge variant={TIER_BADGE_VARIANT[frictionTier]}>{DOMAIN_LABELS[domain]}</Badge>
            <span className="text-xs text-stone-400">Tier {frictionTier}</span>
          </div>
          <p className="text-sm text-stone-300">{commitmentName}</p>
        </div>

        {/* Override history count */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-stone-400">Override history:</span>
          <Badge
            variant={overrideCount >= 5 ? 'error' : overrideCount >= 2 ? 'warning' : 'default'}
          >
            {overrideCountLabel(overrideCount)}
          </Badge>
        </div>

        {/* Tier 2: Countdown notice */}
        {frictionTier === 2 && countdown > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-center">
            <p className="text-sm text-amber-400 font-medium">
              Please wait {countdown} second{countdown !== 1 ? 's' : ''} before confirming
            </p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-stone-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-1000 ease-linear"
                style={{
                  width: `${((TIER_2_COUNTDOWN_SECONDS - countdown) / TIER_2_COUNTDOWN_SECONDS) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Tier 3+: Written reason textarea */}
        {frictionTier >= 3 && (
          <Textarea
            label="Why are you overriding this commitment?"
            placeholder="Explain your reasoning..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={3}
            maxLength={500}
            showCount
          />
        )}

        {/* Tier 4+: Witness notification notice */}
        {frictionTier >= 4 && (
          <div className="rounded-lg border border-orange-500/30 bg-orange-950/20 p-3 flex items-start gap-2">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
            <p className="text-sm text-orange-300">
              A witness will be notified of this override for accountability.
            </p>
          </div>
        )}

        {/* Tier 5: Future-self letter display */}
        {frictionTier === 5 && futureSelfletter && (
          <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-3">
            <p className="text-xs font-medium text-red-400 mb-1">A letter from your past self:</p>
            <p className="text-sm text-stone-300 italic leading-relaxed">
              &ldquo;{futureSelfletter}&rdquo;
            </p>
          </div>
        )}

        {/* Tier 5: Extra confirmation checkbox */}
        {frictionTier === 5 && (
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={extraConfirm}
              onChange={(e) => setExtraConfirm(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-stone-600 bg-stone-800 text-red-500 focus:ring-red-500/20"
            />
            <span className="text-sm text-stone-300">
              I understand this override will be recorded, a witness will be notified, and my
              commitment streak will reset.
            </span>
          </label>
        )}
      </div>
    </AccessibleDialog>
  )
}
