'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getCancellationPolicy, updateCancellationPolicy } from '@/lib/events/cancellation-actions'
import type { CancellationPolicy, CancellationTier } from '@/lib/events/cancellation-actions'
import { useProtectedForm } from '@/lib/qol/use-protected-form'
import { FormShield } from '@/components/forms/form-shield'

// ─── Tier Editor Row ──────────────────────────────────────────────────────────

function TierRow({
  tier,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: {
  tier: CancellationTier
  index: number
  onUpdate: (index: number, updated: CancellationTier) => void
  onRemove: (index: number) => void
  canRemove: boolean
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border p-3">
      <div className="flex-1 grid grid-cols-4 gap-2">
        {/* Label */}
        <div>
          <label className="text-xs text-muted-foreground">Label</label>
          <input
            type="text"
            value={tier.label}
            onChange={(e) => onUpdate(index, { ...tier, label: e.target.value })}
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
          />
        </div>

        {/* Min days */}
        <div>
          <label className="text-xs text-muted-foreground">Min days</label>
          <input
            type="number"
            min={0}
            value={tier.min_days}
            onChange={(e) => onUpdate(index, { ...tier, min_days: parseInt(e.target.value) || 0 })}
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
          />
        </div>

        {/* Max days */}
        <div>
          <label className="text-xs text-muted-foreground">Max days</label>
          <input
            type="number"
            min={0}
            value={tier.max_days ?? ''}
            placeholder="No limit"
            onChange={(e) =>
              onUpdate(index, {
                ...tier,
                max_days: e.target.value ? parseInt(e.target.value) : null,
              })
            }
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
          />
        </div>

        {/* Refund % */}
        <div>
          <label className="text-xs text-muted-foreground">Refund %</label>
          <input
            type="number"
            min={0}
            max={100}
            value={tier.refund_percent}
            onChange={(e) =>
              onUpdate(index, {
                ...tier,
                refund_percent: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
              })
            }
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
          />
        </div>
      </div>

      {canRemove && (
        <Button
          variant="ghost"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
          onClick={() => onRemove(index)}
          aria-label="Remove tier"
        >
          &times;
        </Button>
      )}
    </div>
  )
}

// ─── Plain English Preview ────────────────────────────────────────────────────

function PolicyPreview({
  tiers,
  gracePeriodHours,
}: {
  tiers: CancellationTier[]
  gracePeriodHours: number
}) {
  const sorted = [...tiers].sort((a, b) => b.min_days - a.min_days)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">How this policy reads to clients</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {gracePeriodHours > 0 && (
          <p>
            Clients who cancel within <strong>{gracePeriodHours} hours</strong> of booking receive a{' '}
            <strong>full refund</strong>, regardless of how close the event is.
          </p>
        )}
        {sorted.map((tier, i) => {
          const maxLabel =
            tier.max_days === null
              ? `${tier.min_days}+ days`
              : `${tier.min_days}-${tier.max_days} days`
          return (
            <p key={i}>
              Cancellations <strong>{maxLabel}</strong> before the event:{' '}
              {tier.refund_percent === 100 ? (
                <Badge variant="success">Full refund</Badge>
              ) : tier.refund_percent === 0 ? (
                <Badge variant="error">No refund</Badge>
              ) : (
                <Badge variant="warning">{tier.refund_percent}% refund</Badge>
              )}
            </p>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export function CancellationPolicyEditor({ tenantId }: { tenantId: string }) {
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null)
  const [tiers, setTiers] = useState<CancellationTier[]>([])
  const [gracePeriodHours, setGracePeriodHours] = useState(48)
  const [policyName, setPolicyName] = useState('Standard Policy')
  const [notes, setNotes] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Baseline data (from server) for dirty detection
  const [baselineData, setBaselineData] = useState<Record<string, unknown>>({
    policyName: 'Standard Policy',
    gracePeriodHours: 48,
    notes: '',
    tiers: '[]',
  })

  const currentData = useMemo(
    () => ({
      policyName,
      gracePeriodHours,
      notes,
      tiers: JSON.stringify(tiers),
    }),
    [policyName, gracePeriodHours, notes, tiers]
  )

  const protection = useProtectedForm({
    surfaceId: 'cancellation-policy',
    recordId: policy?.id ?? null,
    tenantId,
    defaultData: baselineData,
    currentData,
    throttleMs: 10_000,
  })

  // Load policy on mount
  useEffect(() => {
    setIsLoading(true)
    getCancellationPolicy()
      .then((result) => {
        if (result.error || !result.data) {
          setLoadError(result.error ?? 'Could not load cancellation policy')
          return
        }
        const p = result.data
        setPolicy(p)
        setTiers(p.tiers)
        setGracePeriodHours(p.gracePeriodHours)
        setPolicyName(p.name)
        setNotes(p.notes ?? '')
        // Set baseline so form starts clean
        setBaselineData({
          policyName: p.name,
          gracePeriodHours: p.gracePeriodHours,
          notes: p.notes ?? '',
          tiers: JSON.stringify(p.tiers),
        })
      })
      .catch(() => {
        setLoadError('Could not load cancellation policy')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  function applyDraftData(data: Record<string, unknown>) {
    if (typeof data.policyName === 'string') setPolicyName(data.policyName)
    if (typeof data.gracePeriodHours === 'number') setGracePeriodHours(data.gracePeriodHours)
    if (typeof data.notes === 'string') setNotes(data.notes)
    if (typeof data.tiers === 'string') {
      try {
        setTiers(JSON.parse(data.tiers))
      } catch {
        /* ignore bad JSON */
      }
    }
  }

  function updateTier(index: number, updated: CancellationTier) {
    setTiers((prev) => prev.map((t, i) => (i === index ? updated : t)))
  }

  function removeTier(index: number) {
    setTiers((prev) => prev.filter((_, i) => i !== index))
  }

  function addTier() {
    setTiers((prev) => [
      ...prev,
      { min_days: 0, max_days: null, refund_percent: 50, label: 'New tier' },
    ])
  }

  function handleSave() {
    if (!policy) return

    startTransition(async () => {
      try {
        const result = await updateCancellationPolicy(policy.id, {
          name: policyName,
          tiers,
          gracePeriodHours,
          notes: notes || null,
        })
        if (!result.success) {
          toast.error(result.error ?? 'Failed to save policy')
          return
        }
        toast.success('Cancellation policy saved')
        // Update baseline and clear draft
        setBaselineData({ ...currentData })
        protection.markCommitted()
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to save policy')
      }
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading cancellation policy...
        </CardContent>
      </Card>
    )
  }

  if (loadError) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {loadError}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <FormShield
      guard={protection.guard}
      showRestorePrompt={protection.showRestorePrompt}
      lastSavedAt={protection.lastSavedAt}
      onRestore={() => {
        const d = protection.restoreDraft()
        if (d) applyDraftData(d)
      }}
      onDiscard={protection.discardDraft}
      saveState={protection.saveState}
    >
      <div className="space-y-6">
        {/* Policy name and grace period */}
        <Card>
          <CardHeader>
            <CardTitle>Cancellation Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Policy name</label>
              <input
                type="text"
                value={policyName}
                onChange={(e) => setPolicyName(e.target.value)}
                aria-label="Policy name"
                className="w-full rounded-md border px-3 py-2 text-sm bg-background mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Grace period (hours after booking)</label>
              <p className="text-xs text-muted-foreground mb-1">
                Clients who cancel within this window after booking receive a full refund, no matter
                how close the event is.
              </p>
              <input
                type="number"
                min={0}
                max={720}
                value={gracePeriodHours}
                onChange={(e) => setGracePeriodHours(parseInt(e.target.value) || 0)}
                aria-label="Grace period hours"
                className="w-32 rounded-md border px-3 py-2 text-sm bg-background"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Notes (internal)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Internal notes about this policy..."
                className="w-full rounded-md border px-3 py-2 text-sm bg-background mt-1 resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tier editor */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Cancellation Tiers</CardTitle>
              <Button variant="secondary" onClick={addTier}>
                Add Tier
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              Define how much of the payment is refunded based on how many days before the event the
              cancellation happens. Leave &quot;Max days&quot; empty for &quot;or more&quot;.
            </p>
            {tiers.map((tier, i) => (
              <TierRow
                key={i}
                tier={tier}
                index={i}
                onUpdate={updateTier}
                onRemove={removeTier}
                canRemove={tiers.length > 1}
              />
            ))}
          </CardContent>
        </Card>

        {/* Preview */}
        <PolicyPreview tiers={tiers} gracePeriodHours={gracePeriodHours} />

        {/* Save */}
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isPending || !protection.isDirty}
          >
            {isPending ? 'Saving...' : 'Save Policy'}
          </Button>
        </div>
      </div>
    </FormShield>
  )
}
