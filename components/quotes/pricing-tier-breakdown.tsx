'use client'

import { useMemo } from 'react'

// Dynamic Pricing Tier Breakdown
// Module: finance
// Shows what different guest counts cost based on the pricing engine's tier structure.
// Pure display component, no mutations.

type TierRow = {
  label: string
  guestRange: string
  ratePerPerson: number | null
  exampleTotal: number | null
}

type Props = {
  serviceType: string
  courseCount: number
  // Rates from the pricing config (couples, group, large)
  couplesRates: Record<number, number> // courseCount -> cents per person
  groupRates: Record<number, number>
  largeGroupMin: number
  largeGroupMax: number
  currentGuestCount?: number
}

export function PricingTierBreakdown({
  serviceType,
  courseCount,
  couplesRates,
  groupRates,
  largeGroupMin,
  largeGroupMax,
  currentGuestCount,
}: Props) {
  const tiers = useMemo(() => {
    if (serviceType !== 'private_dinner') return []

    const courses = courseCount || 3
    const couplesRate = couplesRates[courses] || 0
    const groupRate = groupRates[courses] || 0

    const rows: TierRow[] = []

    if (couplesRate > 0) {
      rows.push({
        label: 'Intimate',
        guestRange: '1-2 guests',
        ratePerPerson: couplesRate,
        exampleTotal: couplesRate * 2,
      })
    }

    if (groupRate > 0) {
      rows.push({
        label: 'Group',
        guestRange: `3-${largeGroupMin - 1} guests`,
        ratePerPerson: groupRate,
        exampleTotal: groupRate * Math.ceil((3 + largeGroupMin - 1) / 2),
      })
    }

    if (largeGroupMin > 0 && largeGroupMax > 0) {
      // Large group rate is typically a step down from group
      // The engine uses the same groupRate for large groups in the current implementation
      rows.push({
        label: 'Large Group',
        guestRange: `${largeGroupMin}-${largeGroupMax} guests`,
        ratePerPerson: groupRate,
        exampleTotal: groupRate ? groupRate * Math.ceil((largeGroupMin + largeGroupMax) / 2) : null,
      })
    }

    rows.push({
      label: 'Buyout',
      guestRange: `${largeGroupMax + 1}+ guests`,
      ratePerPerson: null,
      exampleTotal: null,
    })

    return rows
  }, [serviceType, courseCount, couplesRates, groupRates, largeGroupMin, largeGroupMax])

  if (tiers.length === 0) return null

  // Determine which tier the current guest count falls into
  const activeTierIndex = useMemo(() => {
    if (!currentGuestCount) return -1
    if (currentGuestCount <= 2) return 0
    if (currentGuestCount < largeGroupMin) return 1
    if (currentGuestCount <= largeGroupMax) return 2
    return 3
  }, [currentGuestCount, largeGroupMin, largeGroupMax])

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide">
          Pricing Tiers ({courseCount || 3}-course)
        </h4>
      </div>

      <div className="space-y-0.5">
        {tiers.map((tier, i) => (
          <div
            key={tier.label}
            className={`flex items-center justify-between py-1.5 px-2 rounded text-sm ${
              i === activeTierIndex
                ? 'bg-brand-500/10 border border-brand-500/30'
                : 'bg-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              {i === activeTierIndex && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
              )}
              <div>
                <span
                  className={
                    i === activeTierIndex ? 'text-stone-200 font-medium' : 'text-stone-400'
                  }
                >
                  {tier.label}
                </span>
                <span className="text-stone-600 text-xs ml-1.5">{tier.guestRange}</span>
              </div>
            </div>
            <div className="text-right">
              {tier.ratePerPerson ? (
                <span
                  className={
                    i === activeTierIndex ? 'text-stone-200 font-medium' : 'text-stone-400'
                  }
                >
                  ${(tier.ratePerPerson / 100).toFixed(0)}/pp
                </span>
              ) : (
                <span className="text-stone-600 text-xs italic">Custom quote</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {currentGuestCount &&
        activeTierIndex >= 0 &&
        activeTierIndex < tiers.length &&
        tiers[activeTierIndex].ratePerPerson && (
          <div className="border-t border-stone-800 pt-2 flex justify-between text-xs">
            <span className="text-stone-500">
              {currentGuestCount} guests x $
              {((tiers[activeTierIndex].ratePerPerson || 0) / 100).toFixed(0)}/pp
            </span>
            <span className="text-stone-300 font-medium">
              $
              {((currentGuestCount * (tiers[activeTierIndex].ratePerPerson || 0)) / 100).toFixed(0)}{' '}
              service fee
            </span>
          </div>
        )}
    </div>
  )
}
