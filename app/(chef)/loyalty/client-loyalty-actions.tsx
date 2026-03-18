// Client component for loyalty actions on client detail page
// Award bonus points, redeem rewards, manual adjustments

'use client'

import { useState } from 'react'
import {
  awardBonusPoints,
  redeemReward,
  adjustClientLoyalty,
  type LoyaltyReward,
  type LoyaltyTier,
} from '@/lib/loyalty/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/confirm-modal'

export function AwardBonusForm({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const points = parseInt(formData.get('points') as string)
    const description = formData.get('description') as string

    try {
      await awardBonusPoints(clientId, points, description)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to award points')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Award Bonus Points
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-4 rounded-lg bg-stone-800 space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-stone-500">Points</label>
          <Input name="points" type="number" min="1" required placeholder="50" />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500">Reason</label>
          <Input name="description" required placeholder="Referral bonus" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? 'Awarding...' : 'Award'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

// ============================================
// MANUAL LOYALTY ADJUSTMENT PANEL
// Full manual control: adjust points, set tier, correct stats, reset balance
// ============================================

export function ManualLoyaltyAdjustment({
  clientId,
  currentPoints,
  currentTier,
  currentEventsCompleted,
  currentGuestsServed,
}: {
  clientId: string
  currentPoints: number
  currentTier: LoyaltyTier
  currentEventsCompleted: number
  currentGuestsServed: number
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  // Form state
  const [adjustmentPoints, setAdjustmentPoints] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [overrideTier, setOverrideTier] = useState<string>('')
  const [overrideEvents, setOverrideEvents] = useState('')
  const [overrideGuests, setOverrideGuests] = useState('')
  const [resetPoints, setResetPoints] = useState(false)

  function resetForm() {
    setAdjustmentPoints('')
    setAdjustmentReason('')
    setOverrideTier('')
    setOverrideEvents('')
    setOverrideGuests('')
    setResetPoints(false)
    setError('')
    setSuccess('')
  }

  function hasChanges() {
    return (
      (adjustmentPoints && parseInt(adjustmentPoints) !== 0) ||
      resetPoints ||
      (overrideTier && overrideTier !== currentTier) ||
      (overrideEvents !== '' && parseInt(overrideEvents) !== currentEventsCompleted) ||
      (overrideGuests !== '' && parseInt(overrideGuests) !== currentGuestsServed)
    )
  }

  function buildSummary(): string[] {
    const changes: string[] = []
    if (adjustmentPoints && parseInt(adjustmentPoints) !== 0) {
      const pts = parseInt(adjustmentPoints)
      changes.push(`${pts > 0 ? 'Add' : 'Deduct'} ${Math.abs(pts)} points`)
    }
    if (resetPoints) changes.push('Reset point balance to 0')
    if (overrideTier && overrideTier !== currentTier) {
      changes.push(`Change tier from ${currentTier} to ${overrideTier}`)
    }
    if (overrideEvents !== '' && parseInt(overrideEvents) !== currentEventsCompleted) {
      changes.push(`Set events completed to ${overrideEvents}`)
    }
    if (overrideGuests !== '' && parseInt(overrideGuests) !== currentGuestsServed) {
      changes.push(`Set guests served to ${overrideGuests}`)
    }
    return changes
  }

  async function handleSubmit() {
    setShowConfirm(false)
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const input: Parameters<typeof adjustClientLoyalty>[0] = { clientId }
      if (adjustmentPoints && parseInt(adjustmentPoints) !== 0) {
        input.adjustmentPoints = parseInt(adjustmentPoints)
        input.adjustmentReason = adjustmentReason || undefined
      }
      if (resetPoints) input.resetPoints = true
      if (overrideTier && overrideTier !== currentTier) {
        input.overrideTier = overrideTier as LoyaltyTier
      }
      if (overrideEvents !== '') input.overrideEventsCompleted = parseInt(overrideEvents)
      if (overrideGuests !== '') input.overrideGuestsServed = parseInt(overrideGuests)

      const result = await adjustClientLoyalty(input)
      setSuccess(`Done: ${result.actions.join(', ')}`)
      resetForm()
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust loyalty')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          resetForm()
          setOpen(true)
        }}
      >
        Manual Adjustment
      </Button>
    )
  }

  return (
    <div className="mt-3 p-4 rounded-lg bg-stone-800 border border-stone-700 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-stone-200">Manual Loyalty Adjustment</h4>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-stone-400 hover:text-stone-200 text-sm"
        >
          Close
        </button>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-900/20 rounded px-3 py-2">{error}</p>}
      {success && (
        <p className="text-sm text-green-400 bg-green-900/20 rounded px-3 py-2">{success}</p>
      )}

      {/* Point adjustment */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-stone-400 uppercase tracking-wide">
          Point Adjustment
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              value={adjustmentPoints}
              onChange={(e) => setAdjustmentPoints(e.target.value)}
              type="number"
              placeholder="e.g. 50 or -25"
              disabled={resetPoints}
            />
            <p className="text-xs text-stone-500 mt-1">
              Positive = add, negative = deduct. Current: {currentPoints}
            </p>
          </div>
          <div>
            <Input
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              placeholder="Reason (e.g. error correction)"
              disabled={resetPoints}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-400 cursor-pointer">
          <input
            type="checkbox"
            checked={resetPoints}
            onChange={(e) => {
              setResetPoints(e.target.checked)
              if (e.target.checked) setAdjustmentPoints('')
            }}
            className="h-3.5 w-3.5 rounded border-stone-600 text-red-600 focus:ring-red-500"
          />
          Reset balance to zero
        </label>
      </div>

      {/* Tier override */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-stone-400 uppercase tracking-wide">
          Tier Override
        </label>
        <select
          value={overrideTier}
          onChange={(e) => setOverrideTier(e.target.value)}
          aria-label="Override loyalty tier"
          className="w-full text-sm border border-stone-600 rounded-lg px-3 py-2 bg-stone-900 text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Keep current ({currentTier})</option>
          {(['bronze', 'silver', 'gold', 'platinum'] as const).map((t) => (
            <option key={t} value={t} disabled={t === currentTier}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
        <p className="text-xs text-stone-500">
          Overrides the calculated tier. Tier will recalculate on next point change unless
          overridden again.
        </p>
      </div>

      {/* Stats correction */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-stone-400 uppercase tracking-wide">
          Stats Correction
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-stone-500">Events Completed</label>
            <Input
              value={overrideEvents}
              onChange={(e) => setOverrideEvents(e.target.value)}
              type="number"
              min="0"
              placeholder={`Current: ${currentEventsCompleted}`}
            />
          </div>
          <div>
            <label className="text-xs text-stone-500">Guests Served</label>
            <Input
              value={overrideGuests}
              onChange={(e) => setOverrideGuests(e.target.value)}
              type="number"
              min="0"
              placeholder={`Current: ${currentGuestsServed}`}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-stone-700">
        <Button size="sm" disabled={loading || !hasChanges()} onClick={() => setShowConfirm(true)}>
          {loading ? 'Saving...' : 'Apply Changes'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            resetForm()
            setOpen(false)
          }}
        >
          Cancel
        </Button>
      </div>

      <ConfirmModal
        open={showConfirm}
        title="Confirm Manual Adjustment"
        description={
          hasChanges()
            ? `The following changes will be applied:\n\n${buildSummary()
                .map((s) => `- ${s}`)
                .join('\n')}`
            : 'No changes selected.'
        }
        confirmLabel="Apply"
        variant="primary"
        loading={loading}
        onConfirm={handleSubmit}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  )
}

export function RedeemRewardButton({
  clientId,
  reward,
}: {
  clientId: string
  reward: LoyaltyReward
}) {
  const [loading, setLoading] = useState(false)
  const [showRedeemConfirm, setShowRedeemConfirm] = useState(false)

  function handleRedeem() {
    setShowRedeemConfirm(true)
  }

  async function handleConfirmedRedeem() {
    setShowRedeemConfirm(false)
    setLoading(true)
    try {
      await redeemReward(clientId, reward.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to redeem reward')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={handleRedeem} disabled={loading}>
        {loading ? 'Redeeming...' : 'Redeem'}
      </Button>
      <ConfirmModal
        open={showRedeemConfirm}
        title={`Redeem "${reward.name}"?`}
        description={`This will deduct ${reward.points_required} points from the client's balance.`}
        confirmLabel="Redeem"
        variant="primary"
        loading={loading}
        onConfirm={handleConfirmedRedeem}
        onCancel={() => setShowRedeemConfirm(false)}
      />
    </>
  )
}
