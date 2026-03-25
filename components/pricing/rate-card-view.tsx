// Rate Card - Quick-access pricing reference for mid-conversation use
// Mobile-first, scannable, copy-to-clipboard per section
// Reads from chef's per-chef pricing config (DB) with system defaults as fallback
'use client'

import { useState } from 'react'
import type { PricingConfig, AddOnCatalogEntry } from '@/lib/pricing/config-types'
import {
  COUPLES_RATES,
  GROUP_RATES,
  WEEKLY_RATES,
  WEEKLY_COMMITMENT_MIN_DAYS,
  PIZZA_RATE,
  MULTI_NIGHT_PACKAGES,
  MINIMUM_BOOKING_CENTS,
  DEPOSIT_PERCENTAGE,
  BALANCE_DUE_HOURS_BEFORE,
  IRS_MILEAGE_RATE_CENTS,
  WEEKEND_PREMIUM_PERCENT,
  HOLIDAY_PREMIUMS,
  ADD_ON_CATALOG,
  centsToDisplay,
} from '@/lib/pricing/constants'
import { ChevronDown, ChevronRight, Copy, Check } from '@/components/ui/icons'

// ─── Resolved values from config or defaults ──────────────────────────────

interface ResolvedRateCard {
  couplesRates: Record<number, number>
  groupRates: Record<number, number>
  weeklyStandard: { min: number; max: number }
  weeklyCommit: { min: number; max: number }
  cookAndLeave: number
  commitMinDays: number
  pizzaRate: number
  multiNight: Record<string, number>
  minimumBooking: number
  depositPct: number
  balanceDueHours: number
  mileageRate: number
  weekendPremiumPct: number
  holidayTier1: { min: number; max: number }
  holidayTier2: { min: number; max: number }
  holidayTier3: { min: number; max: number }
  addOns: Array<{
    key: string
    label: string
    type: 'per_person' | 'flat'
    perPersonCents?: number
    flatCents?: number
  }>
}

function resolveFromConfig(config?: PricingConfig | null): ResolvedRateCard {
  if (!config) {
    return {
      couplesRates: COUPLES_RATES,
      groupRates: GROUP_RATES,
      weeklyStandard: WEEKLY_RATES.standard_day,
      weeklyCommit: WEEKLY_RATES.commitment_day,
      cookAndLeave: WEEKLY_RATES.cook_and_leave,
      commitMinDays: WEEKLY_COMMITMENT_MIN_DAYS,
      pizzaRate: PIZZA_RATE,
      multiNight: MULTI_NIGHT_PACKAGES,
      minimumBooking: MINIMUM_BOOKING_CENTS,
      depositPct: DEPOSIT_PERCENTAGE * 100,
      balanceDueHours: BALANCE_DUE_HOURS_BEFORE,
      mileageRate: IRS_MILEAGE_RATE_CENTS,
      weekendPremiumPct: WEEKEND_PREMIUM_PERCENT * 100,
      holidayTier1: {
        min: Math.round(HOLIDAY_PREMIUMS[1].min * 100),
        max: Math.round(HOLIDAY_PREMIUMS[1].max * 100),
      },
      holidayTier2: {
        min: Math.round(HOLIDAY_PREMIUMS[2].min * 100),
        max: Math.round(HOLIDAY_PREMIUMS[2].max * 100),
      },
      holidayTier3: {
        min: Math.round(HOLIDAY_PREMIUMS[3].min * 100),
        max: Math.round(HOLIDAY_PREMIUMS[3].max * 100),
      },
      addOns: Object.entries(ADD_ON_CATALOG).map(([key, def]) => ({ key, ...def })),
    }
  }

  return {
    couplesRates: {
      3: config.couples_rate_3_course,
      4: config.couples_rate_4_course,
      5: config.couples_rate_5_course,
    },
    groupRates: {
      3: config.group_rate_3_course,
      4: config.group_rate_4_course,
      5: config.group_rate_5_course,
    },
    weeklyStandard: { min: config.weekly_standard_min, max: config.weekly_standard_max },
    weeklyCommit: { min: config.weekly_commit_min, max: config.weekly_commit_max },
    cookAndLeave: config.cook_and_leave_rate,
    commitMinDays: WEEKLY_COMMITMENT_MIN_DAYS, // not in config, use constant
    pizzaRate: config.pizza_rate,
    multiNight: (config.multi_night_packages ?? {}) as Record<string, number>,
    minimumBooking: config.minimum_booking_cents,
    depositPct: config.deposit_percentage,
    balanceDueHours: config.balance_due_hours,
    mileageRate: config.mileage_rate_cents,
    weekendPremiumPct: config.weekend_premium_pct,
    holidayTier1: { min: config.holiday_tier1_pct - 5, max: config.holiday_tier1_pct + 5 },
    holidayTier2: { min: config.holiday_tier2_pct - 5, max: config.holiday_tier2_pct + 5 },
    holidayTier3: { min: config.holiday_tier3_pct - 5, max: config.holiday_tier3_pct + 5 },
    addOns: Array.isArray(config.add_on_catalog) ? config.add_on_catalog : [],
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(cents: number): string {
  return centsToDisplay(cents)
}

function fmtRange(range: { min: number; max: number }): string {
  return `${fmt(range.min)}-${fmt(range.max)}`
}

// ─── Collapsible Section ────────────────────────────────────────────────────

function Section({
  title,
  copyText,
  defaultOpen = false,
  children,
}: {
  title: string
  copyText: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [copied, setCopied] = useState(false)

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(copyText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available (e.g. non-HTTPS)
    }
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          )}
          <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{title}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-500" />
              <span className="text-green-500">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </button>
      {open && <div className="px-4 py-3 space-y-2">{children}</div>}
    </div>
  )
}

function RateLine({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex justify-between items-baseline py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</span>
        {sub && <div className="text-xs text-zinc-400">{sub}</div>}
      </div>
    </div>
  )
}

// ─── Copy Text Builders ─────────────────────────────────────────────────────

function couplesCopyText(rc: ResolvedRateCard): string {
  const lines = Object.entries(rc.couplesRates)
    .filter(([, cents]) => cents > 0)
    .map(
      ([courses, cents]) =>
        `${courses} courses: ${fmt(cents)}/person (${fmt(cents * 2)} total for 2)`
    )
  if (lines.length === 0) return 'COUPLES DINNERS (1-2 guests)\n(not yet configured)'
  return `COUPLES DINNERS (1-2 guests)\n${lines.join('\n')}`
}

function groupsCopyText(rc: ResolvedRateCard): string {
  const lines = Object.entries(rc.groupRates)
    .filter(([, cents]) => cents > 0)
    .map(([courses, cents]) => `${courses} courses: ${fmt(cents)}/person`)
  if (lines.length === 0) return 'GROUP DINNERS (3+ guests)\n(not yet configured)'
  return `GROUP DINNERS (3+ guests)\n${lines.join('\n')}\n8-14 guests: group rates apply\n15+ guests: custom/buyout`
}

function weeklyCopyText(rc: ResolvedRateCard): string {
  return `WEEKLY / MEAL PREP
Standard cooking day: ${fmtRange(rc.weeklyStandard)}/day
Commitment rate (${rc.commitMinDays}+ days/week, same home): ${fmtRange(rc.weeklyCommit)}/day
Cook & Leave (2 meals, drop-off): ${fmt(rc.cookAndLeave)}/session`
}

function multiNightCopyText(rc: ResolvedRateCard): string {
  const confirmed = Object.entries(rc.multiNight).filter(([, cents]) => cents > 0)
  if (confirmed.length === 0) return 'MULTI-NIGHT PACKAGES\n(rates not yet confirmed)'
  const lines = confirmed.map(([key, cents]) => `${key.replace(/_/g, ' ')}: ${fmt(cents)}`)
  return `MULTI-NIGHT PACKAGES\n${lines.join('\n')}`
}

function specialtyCopyText(rc: ResolvedRateCard): string {
  if (rc.pizzaRate <= 0) return 'SPECIALTY\n(not yet configured)'
  return `SPECIALTY\nBrick-Fired Pizza Experience: ${fmt(rc.pizzaRate)}/person`
}

function addonsCopyText(rc: ResolvedRateCard): string {
  if (rc.addOns.length === 0) return 'ADD-ONS\n(not yet configured)'
  const lines = rc.addOns.map((def) => {
    if (def.type === 'per_person' && def.perPersonCents) {
      return `${def.label}: ${fmt(def.perPersonCents)}/person`
    }
    if (def.type === 'flat' && def.flatCents) {
      return `${def.label}: ${fmt(def.flatCents)} flat`
    }
    return `${def.label}: custom`
  })
  return `ADD-ONS\n${lines.join('\n')}`
}

function premiumsCopyText(rc: ResolvedRateCard): string {
  return `PREMIUMS & SURCHARGES
Weekend (Fri/Sat): +${Math.round(rc.weekendPremiumPct)}%
Holiday Tier 1 (Xmas, NYE, Thanksgiving, Valentine's): +${rc.holidayTier1.min}-${rc.holidayTier1.max}%
Holiday Tier 2 (Easter, July 4, Mother's Day): +${rc.holidayTier2.min}-${rc.holidayTier2.max}%
Holiday Tier 3 (Memorial Day, Labor Day, Halloween): +${rc.holidayTier3.min}-${rc.holidayTier3.max}%`
}

function termsCopyText(rc: ResolvedRateCard): string {
  return `TERMS
Minimum booking: ${fmt(rc.minimumBooking)}
Deposit: ${rc.depositPct}% non-refundable to lock date
Balance due: ${rc.balanceDueHours} hours before service
Travel: ${fmt(rc.mileageRate)}/mile (IRS 2026 rate)
Groceries: billed at receipt cost, no markup
Table setting & beverages: not included`
}

// ─── Empty State ────────────────────────────────────────────────────────────

function hasAnyRates(rc: ResolvedRateCard): boolean {
  const hasCouples = Object.values(rc.couplesRates).some((v) => v > 0)
  const hasGroups = Object.values(rc.groupRates).some((v) => v > 0)
  const hasWeekly = rc.weeklyStandard.min > 0 || rc.weeklyStandard.max > 0
  return hasCouples || hasGroups || hasWeekly
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface RateCardViewProps {
  config?: PricingConfig | null
}

export function RateCardView({ config }: RateCardViewProps) {
  const [allCopied, setAllCopied] = useState(false)
  const rc = resolveFromConfig(config)

  // Show setup prompt if no rates are configured
  if (!hasAnyRates(rc)) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 p-6 text-center">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            No pricing configured yet
          </p>
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            Set your rates in Settings &rarr; Pricing to see your rate card here.
          </p>
          <a
            href="/settings/pricing"
            className="mt-4 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            Configure Pricing
          </a>
        </div>
      </div>
    )
  }

  const fullText = [
    couplesCopyText(rc),
    groupsCopyText(rc),
    weeklyCopyText(rc),
    multiNightCopyText(rc),
    specialtyCopyText(rc),
    addonsCopyText(rc),
    premiumsCopyText(rc),
    termsCopyText(rc),
  ].join('\n\n')

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(fullText)
      setAllCopied(true)
      setTimeout(() => setAllCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  const confirmedMultiNight = Object.entries(rc.multiNight).filter(([, cents]) => cents > 0)
  const hasCouples = Object.values(rc.couplesRates).some((v) => v > 0)
  const hasGroups = Object.values(rc.groupRates).some((v) => v > 0)

  return (
    <div className="space-y-3 max-w-lg mx-auto">
      {/* Copy All button */}
      <div className="flex justify-end">
        <button
          onClick={copyAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
        >
          {allCopied ? (
            <>
              <Check className="h-3.5 w-3.5" /> Copied Full Rate Card
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy Full Rate Card
            </>
          )}
        </button>
      </div>

      {/* Couples */}
      {hasCouples && (
        <Section title="Couples Dinners (1-2 guests)" copyText={couplesCopyText(rc)} defaultOpen>
          {Object.entries(rc.couplesRates)
            .filter(([, cents]) => cents > 0)
            .map(([courses, cents]) => (
              <RateLine
                key={courses}
                label={`${courses}-course dinner`}
                value={`${fmt(cents)}/person`}
                sub={`${fmt(cents * 2)} total for 2`}
              />
            ))}
        </Section>
      )}

      {/* Groups */}
      {hasGroups && (
        <Section title="Group Dinners (3+ guests)" copyText={groupsCopyText(rc)}>
          {Object.entries(rc.groupRates)
            .filter(([, cents]) => cents > 0)
            .map(([courses, cents]) => (
              <RateLine
                key={courses}
                label={`${courses}-course dinner`}
                value={`${fmt(cents)}/person`}
              />
            ))}
          <RateLine label="Large group (8-14)" value="Group rates" sub="confirm feasibility" />
          <RateLine label="Large event (15+)" value="Custom / Buyout" />
        </Section>
      )}

      {/* Weekly / Meal Prep */}
      {(rc.weeklyStandard.min > 0 || rc.weeklyStandard.max > 0) && (
        <Section title="Weekly / Meal Prep" copyText={weeklyCopyText(rc)} defaultOpen>
          <RateLine label="Standard cooking day" value={fmtRange(rc.weeklyStandard) + '/day'} />
          <RateLine
            label={`Commitment (${rc.commitMinDays}+ days/wk)`}
            value={fmtRange(rc.weeklyCommit) + '/day'}
            sub="Same home, consecutive days"
          />
          <RateLine
            label="Cook & Leave"
            value={fmt(rc.cookAndLeave) + '/session'}
            sub="2 meals, drop-off style"
          />
        </Section>
      )}

      {/* Multi-Night */}
      {confirmedMultiNight.length > 0 && (
        <Section title="Multi-Night Packages" copyText={multiNightCopyText(rc)}>
          {confirmedMultiNight.map(([key, cents]) => (
            <RateLine key={key} label={key.replace(/_/g, ' ')} value={fmt(cents)} />
          ))}
        </Section>
      )}

      {/* Specialty */}
      {rc.pizzaRate > 0 && (
        <Section title="Specialty" copyText={specialtyCopyText(rc)}>
          <RateLine label="Brick-Fired Pizza Experience" value={fmt(rc.pizzaRate) + '/person'} />
        </Section>
      )}

      {/* Add-Ons */}
      {rc.addOns.length > 0 && (
        <Section title="Add-Ons" copyText={addonsCopyText(rc)}>
          {rc.addOns.map((def) => {
            const value =
              def.type === 'per_person' && def.perPersonCents
                ? `${fmt(def.perPersonCents)}/person`
                : def.type === 'flat' && def.flatCents
                  ? `${fmt(def.flatCents)} flat`
                  : 'Custom'
            return <RateLine key={def.key} label={def.label} value={value} />
          })}
        </Section>
      )}

      {/* Premiums */}
      <Section title="Premiums & Surcharges" copyText={premiumsCopyText(rc)}>
        <RateLine label="Weekend (Fri/Sat)" value={`+${Math.round(rc.weekendPremiumPct)}%`} />
        <RateLine
          label="Holiday Tier 1"
          value={`+${rc.holidayTier1.min}-${rc.holidayTier1.max}%`}
          sub="Xmas, NYE, Thanksgiving, Valentine's"
        />
        <RateLine
          label="Holiday Tier 2"
          value={`+${rc.holidayTier2.min}-${rc.holidayTier2.max}%`}
          sub="Easter, July 4, Mother's Day"
        />
        <RateLine
          label="Holiday Tier 3"
          value={`+${rc.holidayTier3.min}-${rc.holidayTier3.max}%`}
          sub="Memorial Day, Labor Day, Halloween"
        />
      </Section>

      {/* Terms */}
      <Section title="Terms & Policies" copyText={termsCopyText(rc)}>
        <RateLine label="Minimum booking" value={fmt(rc.minimumBooking)} />
        <RateLine label="Deposit" value={`${rc.depositPct}% non-refundable`} />
        <RateLine label="Balance due" value={`${rc.balanceDueHours}hrs before service`} />
        <RateLine label="Travel" value={`${fmt(rc.mileageRate)}/mile`} sub="IRS 2026" />
        <RateLine label="Groceries" value="At cost" sub="No markup" />
        <RateLine label="Table setting & beverages" value="Not included" />
      </Section>
    </div>
  )
}
