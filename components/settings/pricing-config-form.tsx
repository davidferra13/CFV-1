'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updatePricingConfig } from '@/lib/pricing/config-actions'
import type { PricingConfig, PricingConfigInput } from '@/lib/pricing/config-types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CostingHelpPopover } from '@/components/costing/costing-help-popover'
import { CostLineReferencePanel } from '@/components/costing/cost-line-reference-panel'

// Policy defaults (deposit, hours, mileage) - reasonable starting points
// Rate defaults are zero: chefs must set their own pricing
const DEFAULTS = {
  couples_rate_3_course: 0,
  couples_rate_4_course: 0,
  couples_rate_5_course: 0,
  group_rate_3_course: 0,
  group_rate_4_course: 0,
  group_rate_5_course: 0,
  weekly_standard_min: 0,
  weekly_standard_max: 0,
  weekly_commit_min: 0,
  weekly_commit_max: 0,
  cook_and_leave_rate: 0,
  pizza_rate: 0,
  deposit_percentage: 50,
  minimum_booking_cents: 0,
  balance_due_hours: 24,
  mileage_rate_cents: 70,
  weekend_premium_pct: 10,
  holiday_tier1_pct: 45,
  holiday_tier2_pct: 30,
  holiday_tier3_pct: 20,
  holiday_proximity_days: 2,
  large_group_min: 8,
  large_group_max: 14,
}

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2)
}

function dollarsToCents(dollars: string): number {
  const num = parseFloat(dollars)
  if (isNaN(num)) return 0
  return Math.round(num * 100)
}

function CentsField({
  label,
  value,
  defaultValue,
  onChange,
  helperText,
}: {
  label: string
  value: number
  defaultValue: number
  onChange: (cents: number) => void
  helperText?: string
}) {
  const [displayValue, setDisplayValue] = useState(centsToDollars(value))
  const isDefault = value === defaultValue

  return (
    <div className="space-y-1">
      <Input
        label={label}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={(e) => {
          setDisplayValue(e.target.value)
          onChange(dollarsToCents(e.target.value))
        }}
        helperText={helperText || (value === 0 ? 'Enter your rate' : undefined)}
      />
    </div>
  )
}

function NumberField({
  label,
  value,
  defaultValue,
  onChange,
  helperText,
  suffix,
}: {
  label: string
  value: number
  defaultValue: number
  onChange: (val: number) => void
  helperText?: string
  suffix?: string
}) {
  const isDefault = value === defaultValue
  return (
    <div className="space-y-1">
      <Input
        label={`${label}${suffix ? ` (${suffix})` : ''}`}
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        helperText={
          helperText || (value === 0 && defaultValue === 0 ? 'Enter your value' : undefined)
        }
      />
    </div>
  )
}

export function PricingConfigForm({
  initialConfig,
  archetype,
}: {
  initialConfig: PricingConfig
  archetype?: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [config, setConfig] = useState<PricingConfig>({ ...initialConfig })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const update = <K extends keyof PricingConfig>(key: K, value: PricingConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
    setSuccess(false)
    setError(null)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(false)

    // Build the update payload (only changed fields)
    const updates: PricingConfigInput = {}
    for (const key of Object.keys(DEFAULTS) as (keyof typeof DEFAULTS)[]) {
      if (config[key] !== initialConfig[key]) {
        ;(updates as Record<string, unknown>)[key] = config[key]
      }
    }
    // Also check weekend_premium_on (boolean, not in DEFAULTS)
    if (config.weekend_premium_on !== initialConfig.weekend_premium_on) {
      updates.weekend_premium_on = config.weekend_premium_on
    }

    startTransition(async () => {
      try {
        const result = await updatePricingConfig(updates)
        if (result.success) {
          setSuccess(true)
          router.refresh()
        } else {
          setError(result.error || 'Failed to save pricing config.')
        }
      } catch (err) {
        console.error('[PricingConfigForm] Save failed:', err)
        setError('Failed to save pricing configuration. Please try again.')
      }
    })
  }

  const resetToDefaults = () => {
    setConfig((prev) => ({
      ...prev,
      ...DEFAULTS,
      weekend_premium_on: false,
    }))
    setSuccess(false)
    setError(null)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Base Rates - Couples */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
            Couples Rates (1-2 guests)
            <CostingHelpPopover topic="per_person" />
          </h2>
          <p className="text-sm text-stone-400">Per-person pricing for intimate dinners</p>
        </CardHeader>
        <CardContent className="p-6 grid gap-4 sm:grid-cols-3">
          <CentsField
            label="3-Course"
            value={config.couples_rate_3_course}
            defaultValue={DEFAULTS.couples_rate_3_course}
            onChange={(v) => update('couples_rate_3_course', v)}
          />
          <CentsField
            label="4-Course"
            value={config.couples_rate_4_course}
            defaultValue={DEFAULTS.couples_rate_4_course}
            onChange={(v) => update('couples_rate_4_course', v)}
          />
          <CentsField
            label="5-Course"
            value={config.couples_rate_5_course}
            defaultValue={DEFAULTS.couples_rate_5_course}
            onChange={(v) => update('couples_rate_5_course', v)}
          />
        </CardContent>
      </Card>

      {/* Base Rates - Groups */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
            Group Rates (3+ guests)
            <CostingHelpPopover topic="food_cost_pct" />
          </h2>
          <p className="text-sm text-stone-400">Per-person pricing for group dinners</p>
        </CardHeader>
        <CardContent className="p-6 grid gap-4 sm:grid-cols-3">
          <CentsField
            label="3-Course"
            value={config.group_rate_3_course}
            defaultValue={DEFAULTS.group_rate_3_course}
            onChange={(v) => update('group_rate_3_course', v)}
          />
          <CentsField
            label="4-Course"
            value={config.group_rate_4_course}
            defaultValue={DEFAULTS.group_rate_4_course}
            onChange={(v) => update('group_rate_4_course', v)}
          />
          <CentsField
            label="5-Course"
            value={config.group_rate_5_course}
            defaultValue={DEFAULTS.group_rate_5_course}
            onChange={(v) => update('group_rate_5_course', v)}
          />
        </CardContent>
      </Card>

      {/* Specialty Rates */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
            Specialty Rates
            <CostingHelpPopover topic="blended_cost" />
          </h2>
          <p className="text-sm text-stone-400">Pizza experience and cook-and-leave sessions</p>
        </CardHeader>
        <CardContent className="p-6 grid gap-4 sm:grid-cols-2">
          <CentsField
            label="Pizza Experience (per person)"
            value={config.pizza_rate}
            defaultValue={DEFAULTS.pizza_rate}
            onChange={(v) => update('pizza_rate', v)}
          />
          <CentsField
            label="Cook & Leave (per session)"
            value={config.cook_and_leave_rate}
            defaultValue={DEFAULTS.cook_and_leave_rate}
            onChange={(v) => update('cook_and_leave_rate', v)}
          />
        </CardContent>
      </Card>

      {/* Weekly / Ongoing */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
            Weekly / Ongoing
            <CostingHelpPopover topic="contribution_margin" />
          </h2>
          <p className="text-sm text-stone-400">Daily rate ranges for weekly cooking engagements</p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-stone-300 mb-3">Standard Day Rate</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <CentsField
                label="Minimum"
                value={config.weekly_standard_min}
                defaultValue={DEFAULTS.weekly_standard_min}
                onChange={(v) => update('weekly_standard_min', v)}
              />
              <CentsField
                label="Maximum"
                value={config.weekly_standard_max}
                defaultValue={DEFAULTS.weekly_standard_max}
                onChange={(v) => update('weekly_standard_max', v)}
              />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-stone-300 mb-3">
              Commitment Day Rate (5+ consecutive days)
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <CentsField
                label="Minimum"
                value={config.weekly_commit_min}
                defaultValue={DEFAULTS.weekly_commit_min}
                onChange={(v) => update('weekly_commit_min', v)}
              />
              <CentsField
                label="Maximum"
                value={config.weekly_commit_max}
                defaultValue={DEFAULTS.weekly_commit_max}
                onChange={(v) => update('weekly_commit_max', v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Policies */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
            Booking Policies
            <CostingHelpPopover topic="breakeven" />
          </h2>
          <p className="text-sm text-stone-400">Deposit, minimum booking, and payment terms</p>
        </CardHeader>
        <CardContent className="p-6 grid gap-4 sm:grid-cols-3">
          <NumberField
            label="Deposit"
            value={config.deposit_percentage}
            defaultValue={DEFAULTS.deposit_percentage}
            onChange={(v) => update('deposit_percentage', v)}
            suffix="%"
          />
          <CentsField
            label="Minimum Booking"
            value={config.minimum_booking_cents}
            defaultValue={DEFAULTS.minimum_booking_cents}
            onChange={(v) => update('minimum_booking_cents', v)}
            helperText="Service fee floor (excludes travel and add-ons)"
          />
          <NumberField
            label="Balance Due"
            value={config.balance_due_hours}
            defaultValue={DEFAULTS.balance_due_hours}
            onChange={(v) => update('balance_due_hours', v)}
            suffix="hours before service"
          />
        </CardContent>
      </Card>

      {/* Mileage */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
            Travel
            <CostingHelpPopover topic="cost_plus" />
          </h2>
          <p className="text-sm text-stone-400">Mileage rate for travel fee calculations</p>
        </CardHeader>
        <CardContent className="p-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Input
              label="Mileage Rate (cents per mile)"
              type="number"
              value={config.mileage_rate_cents}
              onChange={(e) => update('mileage_rate_cents', parseInt(e.target.value, 10) || 0)}
              helperText={
                config.mileage_rate_cents === DEFAULTS.mileage_rate_cents
                  ? `$${(DEFAULTS.mileage_rate_cents / 100).toFixed(2)}/mile (IRS standard)`
                  : `System default: ${DEFAULTS.mileage_rate_cents} cents ($${(DEFAULTS.mileage_rate_cents / 100).toFixed(2)}/mile)`
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Premiums */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
            Premiums
            <CostingHelpPopover topic="q_factor" />
          </h2>
          <p className="text-sm text-stone-400">Weekend and holiday surcharges</p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Weekend Premium */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-stone-300">Weekend Premium (Fri/Sat)</h3>
              <button
                type="button"
                role="switch"
                aria-checked={config.weekend_premium_on}
                onClick={() => update('weekend_premium_on', !config.weekend_premium_on)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900 ${
                  config.weekend_premium_on ? 'bg-brand-600' : 'bg-stone-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    config.weekend_premium_on ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label="Weekend Premium"
                value={config.weekend_premium_pct}
                defaultValue={DEFAULTS.weekend_premium_pct}
                onChange={(v) => update('weekend_premium_pct', v)}
                suffix="%"
              />
            </div>
          </div>

          {/* Holiday Premiums */}
          <div>
            <h3 className="text-sm font-medium text-stone-300 mb-3">Holiday Premiums</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField
                label="Tier 1 (Major holidays)"
                value={config.holiday_tier1_pct}
                defaultValue={DEFAULTS.holiday_tier1_pct}
                onChange={(v) => update('holiday_tier1_pct', v)}
                suffix="%"
                helperText="Christmas, NYE, Valentine's, Thanksgiving"
              />
              <NumberField
                label="Tier 2 (Family holidays)"
                value={config.holiday_tier2_pct}
                defaultValue={DEFAULTS.holiday_tier2_pct}
                onChange={(v) => update('holiday_tier2_pct', v)}
                suffix="%"
                helperText="Mother's/Father's Day, Easter, July 4th"
              />
              <NumberField
                label="Tier 3 (Minor holidays)"
                value={config.holiday_tier3_pct}
                defaultValue={DEFAULTS.holiday_tier3_pct}
                onChange={(v) => update('holiday_tier3_pct', v)}
                suffix="%"
                helperText="Memorial Day, Labor Day, Halloween"
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <NumberField
                label="Proximity Days"
                value={config.holiday_proximity_days}
                defaultValue={DEFAULTS.holiday_proximity_days}
                onChange={(v) => update('holiday_proximity_days', v)}
                helperText="Days before a holiday that qualify for half-premium"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Large Group Thresholds */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
            Guest Count Thresholds
            <CostingHelpPopover topic="batch_allocation" />
          </h2>
          <p className="text-sm text-stone-400">
            Define where large group pricing and custom/buyout pricing kick in
          </p>
        </CardHeader>
        <CardContent className="p-6 grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Large Group Minimum"
            value={config.large_group_min}
            defaultValue={DEFAULTS.large_group_min}
            onChange={(v) => update('large_group_min', v)}
            helperText="Guests at or above this count get the large group flag"
          />
          <NumberField
            label="Large Group Maximum"
            value={config.large_group_max}
            defaultValue={DEFAULTS.large_group_max}
            onChange={(v) => update('large_group_max', v)}
            helperText="Above this count requires custom/buyout pricing"
          />
        </CardContent>
      </Card>

      {/* Operator-Specific Cost Lines Reference */}
      <CostLineReferencePanel archetype={archetype} />

      {/* Status Messages */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="text-sm text-emerald-300">Pricing configuration saved.</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={resetToDefaults}
          className="text-sm text-stone-500 hover:text-stone-400 transition-colors"
        >
          Reset to system defaults
        </button>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
