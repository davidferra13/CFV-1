'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import {
  calculateDynamicPrice,
  formatPrice,
  type AddOn,
  type SeasonalPricing,
} from '@/lib/packages/pricing-calculator'

type PackagePricingPreviewProps = {
  basePriceCents: number
  minGuests: number
  maxGuests: number | null
  addOns: AddOn[]
  seasonalPricing: SeasonalPricing | null
}

const SEASON_OPTIONS = [
  { value: 'current', label: 'Current Date' },
  { value: 'off_peak', label: 'Off-Peak (Jan-Mar)' },
  { value: 'spring', label: 'Spring (Apr-May)' },
  { value: 'summer', label: 'Summer (Jun-Aug)' },
  { value: 'fall', label: 'Fall (Sep-Oct)' },
  { value: 'holiday', label: 'Holiday (Nov-Dec)' },
]

// Map season to a representative month (0-indexed)
const SEASON_MONTH: Record<string, number> = {
  off_peak: 0, // January
  spring: 3, // April
  summer: 6, // July
  fall: 8, // September
  holiday: 11, // December
}

export function PackagePricingPreview({
  basePriceCents,
  minGuests,
  maxGuests,
  addOns,
  seasonalPricing,
}: PackagePricingPreviewProps) {
  const effectiveMax = maxGuests ?? 20
  const [guestCount, setGuestCount] = useState(Math.max(minGuests, 4))
  const [seasonKey, setSeasonKey] = useState('current')
  const [selectedAddOns, setSelectedAddOns] = useState<Set<number>>(new Set())

  const dateForSeason = useMemo(() => {
    if (seasonKey === 'current') return new Date()
    const month = SEASON_MONTH[seasonKey] ?? 0
    const d = new Date()
    d.setMonth(month, 15)
    return d
  }, [seasonKey])

  const activeAddOns = useMemo(() => {
    return addOns.filter((_, i) => selectedAddOns.has(i))
  }, [addOns, selectedAddOns])

  const breakdown = useMemo(() => {
    if (basePriceCents <= 0) return null
    return calculateDynamicPrice(
      basePriceCents,
      guestCount,
      dateForSeason,
      activeAddOns,
      seasonalPricing
    )
  }, [basePriceCents, guestCount, dateForSeason, activeAddOns, seasonalPricing])

  function toggleAddOn(idx: number) {
    setSelectedAddOns((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) {
        next.delete(idx)
      } else {
        next.add(idx)
      }
      return next
    })
  }

  if (!breakdown) {
    return (
      <Card className="p-5">
        <p className="text-sm text-gray-500">Set a base price to see the pricing preview.</p>
      </Card>
    )
  }

  return (
    <Card className="p-5 space-y-5">
      <h3 className="font-semibold text-base">Pricing Preview</h3>

      {/* Guest Count Slider */}
      <div>
        <label className="block text-sm font-medium mb-1">Guests: {guestCount}</label>
        <input
          type="range"
          min={minGuests}
          max={effectiveMax}
          value={guestCount}
          onChange={(e) => setGuestCount(parseInt(e.target.value))}
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{minGuests}</span>
          <span>{effectiveMax}</span>
        </div>
      </div>

      {/* Season Selector */}
      {seasonalPricing && (
        <div>
          <label className="block text-sm font-medium mb-1">Season</label>
          <div className="flex flex-wrap gap-2">
            {SEASON_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSeasonKey(opt.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  seasonKey === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add-on Checkboxes */}
      {addOns.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2">Add-ons</label>
          <div className="space-y-2">
            {addOns.map((addon, idx) => (
              <label key={idx} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedAddOns.has(idx)}
                  onChange={() => toggleAddOn(idx)}
                />
                <span>{addon.name}</span>
                <span className="text-gray-500">
                  {formatPrice(addon.price_cents)}
                  {addon.per_person ? '/person' : ' flat'}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Price Breakdown */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Base per person</span>
          <span>{formatPrice(basePriceCents)}</span>
        </div>

        {breakdown.guestDiscount < 1 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Volume discount ({Math.round((1 - breakdown.guestDiscount) * 100)}% off)</span>
            <span>
              -{formatPrice(basePriceCents - Math.round(basePriceCents * breakdown.guestDiscount))}
              /person
            </span>
          </div>
        )}

        {breakdown.seasonalMultiplier !== 1 && (
          <div className="flex justify-between text-sm">
            <span>
              {breakdown.seasonLabel} pricing
              {breakdown.seasonalMultiplier > 1
                ? ` (+${Math.round((breakdown.seasonalMultiplier - 1) * 100)}%)`
                : ` (${Math.round((1 - breakdown.seasonalMultiplier) * 100)}% off)`}
            </span>
            <span
              className={breakdown.seasonalMultiplier > 1 ? 'text-orange-600' : 'text-green-600'}
            >
              x{breakdown.seasonalMultiplier.toFixed(2)}
            </span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span>Adjusted per person</span>
          <span>{formatPrice(breakdown.perPersonCents)}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span>x {breakdown.guestCount} guests</span>
          <span>{formatPrice(breakdown.subtotalCents)}</span>
        </div>

        {breakdown.addOnsDetail.length > 0 && (
          <>
            <div className="border-t pt-2 mt-2" />
            {breakdown.addOnsDetail.map((detail, idx) => (
              <div key={idx} className="flex justify-between text-sm text-gray-600">
                <span>{detail.name}</span>
                <span>+{formatPrice(detail.totalCents)}</span>
              </div>
            ))}
          </>
        )}

        <div className="border-t pt-3 mt-3 flex justify-between font-semibold text-lg">
          <span>Total</span>
          <span>{formatPrice(breakdown.totalCents)}</span>
        </div>

        <p className="text-xs text-gray-400 text-right">
          {formatPrice(breakdown.perPersonCents)}/person
        </p>
      </div>
    </Card>
  )
}
