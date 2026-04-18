'use client'

import { useState } from 'react'

type PackageDeal = {
  name: string
  priceDollars: string
}

type ExistingPricingData = {
  hourlyRate: string
  perGuestRate: string
  minimumBooking: string
  packages: PackageDeal[]
}

import type { StepCopy } from '@/lib/onboarding/archetype-copy'

type PricingStepWizardProps = {
  onComplete: (data: Record<string, unknown>) => void
  onSkip: () => void
  existingData?: ExistingPricingData
  copy?: StepCopy
}

// Shared input class for currency fields (no left padding needed; $ is a sibling element).
const currencyInputClass =
  'block w-full bg-transparent py-2 pr-3 text-foreground tabular-nums outline-none placeholder:text-muted-foreground'

function sanitizeCurrencyInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '')
  if (!cleaned) return ''

  const hasDecimal = cleaned.includes('.')
  const [wholePart = '', ...decimalParts] = cleaned.split('.')
  const decimalPart = decimalParts.join('').slice(0, 2)
  const normalizedWhole = wholePart === '' && hasDecimal ? '0' : wholePart

  return hasDecimal ? `${normalizedWhole}.${decimalPart}` : normalizedWhole
}

type CurrencyInputProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

function CurrencyInput({
  id,
  value,
  onChange,
  placeholder = '0.00',
  className = currencyInputClass,
}: CurrencyInputProps) {
  return (
    <div className="mt-1 flex items-center rounded-md border border-border bg-background px-3 shadow-sm focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500">
      <span className="shrink-0 select-none pr-3 text-sm font-medium text-muted-foreground">$</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(sanitizeCurrencyInput(e.target.value))}
        placeholder={placeholder}
        className={className}
      />
    </div>
  )
}

export function PricingStepWizard({
  onComplete,
  onSkip,
  existingData,
  copy,
}: PricingStepWizardProps) {
  const [hourlyRate, setHourlyRate] = useState(existingData?.hourlyRate ?? '')
  const [perGuestRate, setPerGuestRate] = useState(existingData?.perGuestRate ?? '')
  const [minimumBooking, setMinimumBooking] = useState(existingData?.minimumBooking ?? '')
  const [packages, setPackages] = useState<PackageDeal[]>(existingData?.packages ?? [])

  function addPackage() {
    setPackages((prev) => [...prev, { name: '', priceDollars: '' }])
  }

  function updatePackage(index: number, field: keyof PackageDeal, value: string) {
    setPackages((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  function removePackage(index: number) {
    setPackages((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const pricingConfig: Record<string, unknown> = {}

    if (perGuestRate) {
      pricingConfig.group_rate_3_course = Math.round(parseFloat(perGuestRate) * 100)
    }
    if (minimumBooking) {
      pricingConfig.minimum_booking_cents = Math.round(parseFloat(minimumBooking) * 100)
    }
    if (hourlyRate) {
      pricingConfig.cook_and_leave_rate = Math.round(parseFloat(hourlyRate) * 100)
    }

    const validPackages = packages.filter((p) => p.name.trim() && p.priceDollars)
    if (validPackages.length > 0) {
      pricingConfig.add_on_catalog = validPackages.map((p) => ({
        name: p.name.trim(),
        price_cents: Math.round(parseFloat(p.priceDollars) * 100),
        type: 'package',
      }))
    }

    // No pricing data entered: treat as skip, not false completion
    if (Object.keys(pricingConfig).length === 0) {
      onSkip()
      return
    }

    onComplete({ pricingConfig })
  }

  const hasAnyPricing = hourlyRate || perGuestRate || minimumBooking || packages.length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Set your pricing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every chef prices differently. Set your base rates so clients know what to expect.
        </p>
      </div>

      <div className="space-y-4">
        {/* Hourly Rate (hidden when archetype sets hourlyLabel to null) */}
        {copy?.hourlyLabel !== null && (
          <div>
            <label htmlFor="hourlyRate" className="block text-sm font-medium text-foreground">
              {copy?.hourlyLabel || 'Hourly Rate'}
            </label>
            <CurrencyInput id="hourlyRate" value={hourlyRate} onChange={setHourlyRate} />
          </div>
        )}

        {/* Per-Guest / Per-Person / Per-Meal Rate */}
        <div>
          <label htmlFor="perGuestRate" className="block text-sm font-medium text-foreground">
            {copy?.rateLabel || 'Per-Guest Rate'}
          </label>
          <CurrencyInput id="perGuestRate" value={perGuestRate} onChange={setPerGuestRate} />
          <p className="mt-1 text-xs text-muted-foreground">
            {copy?.rateHint || 'Price per person'}
          </p>
        </div>

        {/* Minimum Booking */}
        <div>
          <label htmlFor="minimumBooking" className="block text-sm font-medium text-foreground">
            {copy?.minimumLabel || 'Minimum Booking Amount'}
          </label>
          <CurrencyInput id="minimumBooking" value={minimumBooking} onChange={setMinimumBooking} />
        </div>

        {/* Package Deals */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-foreground">Package Deals</label>
            <button
              type="button"
              onClick={addPackage}
              className="text-xs text-orange-600 hover:text-orange-500 font-medium"
            >
              + Add package
            </button>
          </div>

          {packages.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Optional. e.g. "Dinner Party for 8" at a fixed price.
            </p>
          )}

          {packages.map((pkg, i) => (
            <div key={i} className="flex gap-2 mt-2">
              <input
                type="text"
                value={pkg.name}
                onChange={(e) => updatePackage(i, 'name', e.target.value)}
                placeholder="Package name"
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <div className="w-28">
                <CurrencyInput
                  value={pkg.priceDollars}
                  onChange={(value) => updatePackage(i, 'priceDollars', value)}
                  className={`${currencyInputClass} text-sm`}
                />
              </div>
              <button
                type="button"
                onClick={() => removePackage(i)}
                className="text-muted-foreground hover:text-red-500 px-1"
                aria-label={`Remove package ${i + 1}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      <a
        href="/settings/pricing"
        className="inline-block text-sm text-orange-600 hover:text-orange-500 underline"
      >
        I have more complex pricing (set up on full pricing page)
      </a>

      <p className="text-xs text-muted-foreground">
        You can always update pricing later from your dashboard.
      </p>

      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          I'll do this later
        </button>
        <button
          type="submit"
          className="rounded-md bg-orange-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          {hasAnyPricing ? 'Continue' : 'Skip'}
        </button>
      </div>
    </form>
  )
}
