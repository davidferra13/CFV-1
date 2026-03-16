// Rate Card - Quick-access pricing reference for mid-conversation use
// Mobile-first, scannable, copy-to-clipboard per section
'use client'

import { useState } from 'react'
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

function couplesCopyText(): string {
  const lines = Object.entries(COUPLES_RATES).map(
    ([courses, cents]) => `${courses} courses: ${fmt(cents)}/person (${fmt(cents * 2)} total for 2)`
  )
  return `COUPLES DINNERS (1-2 guests)\n${lines.join('\n')}`
}

function groupsCopyText(): string {
  const lines = Object.entries(GROUP_RATES).map(
    ([courses, cents]) => `${courses} courses: ${fmt(cents)}/person`
  )
  return `GROUP DINNERS (3+ guests)\n${lines.join('\n')}\n8-14 guests: group rates apply\n15+ guests: custom/buyout`
}

function weeklyCopyText(): string {
  return `WEEKLY / MEAL PREP
Standard cooking day: ${fmtRange(WEEKLY_RATES.standard_day)}/day
Commitment rate (${WEEKLY_COMMITMENT_MIN_DAYS}+ days/week, same home): ${fmtRange(WEEKLY_RATES.commitment_day)}/day
Cook & Leave (2 meals, drop-off): ${fmt(WEEKLY_RATES.cook_and_leave)}/session`
}

function multiNightCopyText(): string {
  const confirmed = Object.entries(MULTI_NIGHT_PACKAGES).filter(([, cents]) => cents > 0)
  if (confirmed.length === 0) return 'MULTI-NIGHT PACKAGES\n(rates not yet confirmed)'
  const lines = confirmed.map(([key, cents]) => `${key.replace(/_/g, ' ')}: ${fmt(cents)}`)
  return `MULTI-NIGHT PACKAGES\n${lines.join('\n')}`
}

function specialtyCopyText(): string {
  return `SPECIALTY\nBrick-Fired Pizza Experience: ${fmt(PIZZA_RATE)}/person`
}

function addonsCopyText(): string {
  const lines = Object.entries(ADD_ON_CATALOG).map(([, def]) => {
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

function premiumsCopyText(): string {
  return `PREMIUMS & SURCHARGES
Weekend (Fri/Sat): +${Math.round(WEEKEND_PREMIUM_PERCENT * 100)}%
Holiday Tier 1 (Xmas, NYE, Thanksgiving, Valentine's): +${Math.round(HOLIDAY_PREMIUMS[1].default * 100)}%
Holiday Tier 2 (Easter, July 4, Mother's Day): +${Math.round(HOLIDAY_PREMIUMS[2].default * 100)}%
Holiday Tier 3 (Memorial Day, Labor Day, Halloween): +${Math.round(HOLIDAY_PREMIUMS[3].default * 100)}%`
}

function termsCopyText(): string {
  return `TERMS
Minimum booking: ${fmt(MINIMUM_BOOKING_CENTS)}
Deposit: ${DEPOSIT_PERCENTAGE * 100}% non-refundable to lock date
Balance due: ${BALANCE_DUE_HOURS_BEFORE} hours before service
Travel: ${fmt(IRS_MILEAGE_RATE_CENTS)}/mile (IRS 2026 rate)
Groceries: billed at receipt cost, no markup
Table setting & beverages: not included`
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function RateCardView() {
  const [allCopied, setAllCopied] = useState(false)

  const fullText = [
    couplesCopyText(),
    groupsCopyText(),
    weeklyCopyText(),
    multiNightCopyText(),
    specialtyCopyText(),
    addonsCopyText(),
    premiumsCopyText(),
    termsCopyText(),
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

  const confirmedMultiNight = Object.entries(MULTI_NIGHT_PACKAGES).filter(([, cents]) => cents > 0)

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
      <Section title="Couples Dinners (1-2 guests)" copyText={couplesCopyText()} defaultOpen>
        {Object.entries(COUPLES_RATES).map(([courses, cents]) => (
          <RateLine
            key={courses}
            label={`${courses}-course dinner`}
            value={`${fmt(cents)}/person`}
            sub={`${fmt(cents * 2)} total for 2`}
          />
        ))}
      </Section>

      {/* Groups */}
      <Section title="Group Dinners (3+ guests)" copyText={groupsCopyText()}>
        {Object.entries(GROUP_RATES).map(([courses, cents]) => (
          <RateLine
            key={courses}
            label={`${courses}-course dinner`}
            value={`${fmt(cents)}/person`}
          />
        ))}
        <RateLine label="Large group (8-14)" value="Group rates" sub="confirm feasibility" />
        <RateLine label="Large event (15+)" value="Custom / Buyout" />
      </Section>

      {/* Weekly / Meal Prep */}
      <Section title="Weekly / Meal Prep" copyText={weeklyCopyText()} defaultOpen>
        <RateLine
          label="Standard cooking day"
          value={fmtRange(WEEKLY_RATES.standard_day) + '/day'}
        />
        <RateLine
          label={`Commitment (${WEEKLY_COMMITMENT_MIN_DAYS}+ days/wk)`}
          value={fmtRange(WEEKLY_RATES.commitment_day) + '/day'}
          sub="Same home, consecutive days"
        />
        <RateLine
          label="Cook & Leave"
          value={fmt(WEEKLY_RATES.cook_and_leave) + '/session'}
          sub="2 meals, drop-off style"
        />
      </Section>

      {/* Multi-Night */}
      {confirmedMultiNight.length > 0 && (
        <Section title="Multi-Night Packages" copyText={multiNightCopyText()}>
          {confirmedMultiNight.map(([key, cents]) => (
            <RateLine key={key} label={key.replace(/_/g, ' ')} value={fmt(cents)} />
          ))}
        </Section>
      )}

      {/* Specialty */}
      <Section title="Specialty" copyText={specialtyCopyText()}>
        <RateLine label="Brick-Fired Pizza Experience" value={fmt(PIZZA_RATE) + '/person'} />
      </Section>

      {/* Add-Ons */}
      <Section title="Add-Ons" copyText={addonsCopyText()}>
        {Object.entries(ADD_ON_CATALOG).map(([key, def]) => {
          const value =
            def.type === 'per_person' && def.perPersonCents
              ? `${fmt(def.perPersonCents)}/person`
              : def.type === 'flat' && def.flatCents
                ? `${fmt(def.flatCents)} flat`
                : 'Custom'
          return <RateLine key={key} label={def.label} value={value} />
        })}
      </Section>

      {/* Premiums */}
      <Section title="Premiums & Surcharges" copyText={premiumsCopyText()}>
        <RateLine
          label="Weekend (Fri/Sat)"
          value={`+${Math.round(WEEKEND_PREMIUM_PERCENT * 100)}%`}
        />
        <RateLine
          label="Holiday Tier 1"
          value={`+${Math.round(HOLIDAY_PREMIUMS[1].min * 100)}-${Math.round(HOLIDAY_PREMIUMS[1].max * 100)}%`}
          sub="Xmas, NYE, Thanksgiving, Valentine's"
        />
        <RateLine
          label="Holiday Tier 2"
          value={`+${Math.round(HOLIDAY_PREMIUMS[2].min * 100)}-${Math.round(HOLIDAY_PREMIUMS[2].max * 100)}%`}
          sub="Easter, July 4, Mother's Day"
        />
        <RateLine
          label="Holiday Tier 3"
          value={`+${Math.round(HOLIDAY_PREMIUMS[3].min * 100)}-${Math.round(HOLIDAY_PREMIUMS[3].max * 100)}%`}
          sub="Memorial Day, Labor Day, Halloween"
        />
      </Section>

      {/* Terms */}
      <Section title="Terms & Policies" copyText={termsCopyText()}>
        <RateLine label="Minimum booking" value={fmt(MINIMUM_BOOKING_CENTS)} />
        <RateLine label="Deposit" value={`${DEPOSIT_PERCENTAGE * 100}% non-refundable`} />
        <RateLine label="Balance due" value={`${BALANCE_DUE_HOURS_BEFORE}hrs before service`} />
        <RateLine label="Travel" value={`${fmt(IRS_MILEAGE_RATE_CENTS)}/mile`} sub="IRS 2026" />
        <RateLine label="Groceries" value="At cost" sub="No markup" />
        <RateLine label="Table setting & beverages" value="Not included" />
      </Section>
    </div>
  )
}
