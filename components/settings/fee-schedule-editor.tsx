'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { deleteFeeSchedule, upsertFeeSchedule } from '@/lib/events/fee-schedule-actions'
import type { FeeScheduleEntry, FeeScheduleTier } from '@/lib/events/fee-schedule-actions'

type DraftTier = FeeScheduleTier & {
  key: string
}

type TierErrorMap = Record<number, string[]>

const defaultTiers: FeeScheduleTier[] = [
  {
    days_before_min: 0,
    days_before_max: 2,
    fee_type: 'percent',
    fee_value: 10000,
    description: 'Changes within 48 hours carry the full event fee.',
  },
  {
    days_before_min: 3,
    days_before_max: 7,
    fee_type: 'percent',
    fee_value: 5000,
    description: 'Changes inside one week carry a partial fee.',
  },
  {
    days_before_min: 8,
    days_before_max: 30,
    fee_type: 'flat',
    fee_value: 0,
    description: 'Changes with more notice have no fee.',
  },
]

function makeDraftTier(tier: FeeScheduleTier, index: number): DraftTier {
  return {
    days_before_min: tier.days_before_min,
    days_before_max: tier.days_before_max,
    fee_type: tier.fee_type,
    fee_value: tier.fee_value,
    description: tier.description ?? '',
    key: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
  }
}

function currencyFromCents(cents: number) {
  return (cents / 100).toFixed(2)
}

function displayFeeValue(tier: DraftTier) {
  if (tier.fee_type === 'flat') return currencyFromCents(tier.fee_value)
  return (tier.fee_value / 100).toString()
}

function feeSummary(tier: DraftTier) {
  if (tier.fee_type === 'flat') return `$${currencyFromCents(tier.fee_value)} flat fee`
  return `${tier.fee_value / 100}% of paid event total`
}

function rangeSummary(tier: DraftTier) {
  if (tier.days_before_min === tier.days_before_max) return `${tier.days_before_min} days before`
  return `${tier.days_before_min}-${tier.days_before_max} days before`
}

function validateTiers(tiers: DraftTier[]) {
  const errors: TierErrorMap = {}

  tiers.forEach((tier, index) => {
    const tierErrors: string[] = []

    if (!Number.isInteger(tier.days_before_min) || tier.days_before_min < 0) {
      tierErrors.push('Minimum days must be a whole number of 0 or more.')
    }

    if (!Number.isInteger(tier.days_before_max) || tier.days_before_max < tier.days_before_min) {
      tierErrors.push('Maximum days must be greater than or equal to minimum days.')
    }

    if (tier.fee_type === 'percent' && tier.fee_value > 10000) {
      tierErrors.push('Percent fee cannot exceed 100%.')
    }

    if (!Number.isInteger(tier.fee_value) || tier.fee_value < 0) {
      tierErrors.push('Fee must be 0 or more.')
    }

    if (tierErrors.length > 0) {
      errors[index] = tierErrors
    }
  })

  const sorted = tiers
    .map((tier, index) => ({ tier, index }))
    .sort((a, b) => a.tier.days_before_min - b.tier.days_before_min)

  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1]
    const current = sorted[i]

    if (current.tier.days_before_min <= previous.tier.days_before_max) {
      errors[current.index] = [
        ...(errors[current.index] ?? []),
        'Day ranges cannot overlap another tier.',
      ]
    }
  }

  return errors
}

export function FeeScheduleEditor({ initialTiers }: { initialTiers: FeeScheduleEntry[] }) {
  const [tiers, setTiers] = useState<DraftTier[]>(() => {
    const seed = initialTiers.length > 0 ? initialTiers : defaultTiers
    return seed.map(makeDraftTier)
  })
  const [isPending, startTransition] = useTransition()

  const tierErrors = useMemo(() => validateTiers(tiers), [tiers])
  const hasErrors = Object.keys(tierErrors).length > 0
  const hasNoTiers = tiers.length === 0

  function updateTier(index: number, changes: Partial<FeeScheduleTier>) {
    setTiers((current) =>
      current.map((tier, tierIndex) => (tierIndex === index ? { ...tier, ...changes } : tier))
    )
  }

  function addTier() {
    const maxDay = tiers.reduce((max, tier) => Math.max(max, tier.days_before_max), -1)
    setTiers((current) => [
      ...current,
      makeDraftTier(
        {
          days_before_min: maxDay + 1,
          days_before_max: maxDay + 7,
          fee_type: 'percent',
          fee_value: 0,
          description: '',
        },
        current.length
      ),
    ])
  }

  function removeTier(index: number) {
    setTiers((current) => current.filter((_, tierIndex) => tierIndex !== index))
  }

  function handleClearAll() {
    const confirmed = window.confirm(
      'Clear the full fee schedule? Cancellation and reschedule changes will have no fee tiers until you add new ones.'
    )

    if (!confirmed) return

    startTransition(() => {
      void (async () => {
        const result = await deleteFeeSchedule()

        if (!result.success) {
          toast.error(result.error ?? 'Failed to clear fee schedule')
          return
        }

        toast.success('Fee schedule cleared')
        setTiers([])
      })()
    })
  }

  function handleFeeValueChange(index: number, value: string) {
    const parsed = Number(value)
    const safeValue = Number.isFinite(parsed) ? Math.max(0, parsed) : 0
    const tier = tiers[index]
    const feeValue =
      tier.fee_type === 'flat' ? Math.round(safeValue * 100) : Math.round(safeValue * 100)

    updateTier(index, { fee_value: feeValue })
  }

  function handleFeeTypeChange(index: number, feeType: FeeScheduleTier['fee_type']) {
    updateTier(index, {
      fee_type: feeType,
      fee_value: 0,
    })
  }

  function handleSave() {
    if (hasNoTiers) {
      toast.error('Add at least one tier before saving')
      return
    }

    if (hasErrors) {
      toast.error('Fix fee schedule errors before saving')
      return
    }

    startTransition(() => {
      void (async () => {
        const payload = tiers
          .map((tier) => ({
            days_before_min: tier.days_before_min,
            days_before_max: tier.days_before_max,
            fee_type: tier.fee_type,
            fee_value: tier.fee_value,
            description: tier.description?.trim() || undefined,
          }))
          .sort((a, b) => a.days_before_min - b.days_before_min)

        const result = await upsertFeeSchedule(payload)

        if (!result.success) {
          toast.error(result.error ?? 'Failed to save fee schedule')
          return
        }

        toast.success('Fee schedule saved')
        setTiers(payload.map(makeDraftTier))
      })()
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Reschedule Fee Tiers</CardTitle>
              <CardDescription className="mt-1">
                Fees apply when an event is changed within a configured day range.
              </CardDescription>
            </div>
            <Button type="button" variant="secondary" onClick={addTier}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add tier
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasNoTiers ? (
            <div className="rounded-lg border border-dashed border-stone-700 bg-stone-900/30 p-6 text-sm text-stone-400">
              No fee tiers are configured. Add a tier to define a cancellation or reschedule fee
              window.
            </div>
          ) : null}

          {tiers.map((tier, index) => (
            <div
              key={tier.key}
              className="rounded-lg border border-stone-700/50 bg-stone-900/40 p-4"
            >
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-start">
                <Input
                  label="Minimum days"
                  type="number"
                  min={0}
                  step={1}
                  value={tier.days_before_min}
                  onChange={(event) =>
                    updateTier(index, {
                      days_before_min: Number.parseInt(event.target.value, 10) || 0,
                    })
                  }
                />
                <Input
                  label="Maximum days"
                  type="number"
                  min={0}
                  step={1}
                  value={tier.days_before_max}
                  onChange={(event) =>
                    updateTier(index, {
                      days_before_max: Number.parseInt(event.target.value, 10) || 0,
                    })
                  }
                />
                <Select
                  label="Fee type"
                  value={tier.fee_type}
                  onChange={(event) =>
                    handleFeeTypeChange(index, event.target.value as FeeScheduleTier['fee_type'])
                  }
                  options={[
                    { value: 'percent', label: 'Percent' },
                    { value: 'flat', label: 'Flat amount' },
                  ]}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-0 md:mt-7"
                  onClick={() => removeTier(index)}
                  tooltip="Remove tier"
                  aria-label="Remove tier"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[12rem_1fr]">
                <Input
                  label={tier.fee_type === 'flat' ? 'Fee dollars' : 'Fee percent'}
                  type="number"
                  min={0}
                  max={tier.fee_type === 'percent' ? 100 : undefined}
                  step={tier.fee_type === 'flat' ? '0.01' : '0.01'}
                  value={displayFeeValue(tier)}
                  onChange={(event) => handleFeeValueChange(index, event.target.value)}
                  helperText={
                    tier.fee_type === 'flat' ? 'Saved as cents.' : 'Saved as basis points.'
                  }
                />
                <Textarea
                  label="Description"
                  value={tier.description ?? ''}
                  rows={2}
                  onChange={(event) => updateTier(index, { description: event.target.value })}
                  placeholder="Explain when this fee applies."
                />
              </div>

              <div className="mt-3 text-sm text-stone-400">
                {rangeSummary(tier)}: <span className="text-stone-200">{feeSummary(tier)}</span>
              </div>

              {tierErrors[index]?.length ? (
                <div className="mt-3 space-y-1 text-sm text-red-300">
                  {tierErrors[index].map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-stone-400">
            Tiers are saved in ascending day order and used for cancellation and reschedule fees.
          </p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="danger"
              onClick={handleClearAll}
              disabled={isPending || hasNoTiers}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Clear all
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isPending || hasErrors || hasNoTiers}
              tooltip={hasNoTiers ? 'Add at least one tier before saving' : undefined}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {isPending ? 'Saving...' : 'Save schedule'}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {hasNoTiers ? (
        <Alert variant="warning" title="No fee schedule configured">
          Cancellation and reschedule changes will not match a fee tier until you add one.
        </Alert>
      ) : (
        <Alert variant="info" title="Fee calculation">
          Flat amounts are stored in cents. Percent amounts are stored as basis points, where 100%
          equals 10000.
        </Alert>
      )}
    </div>
  )
}
