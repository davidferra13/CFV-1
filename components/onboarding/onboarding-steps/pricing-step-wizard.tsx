'use client'

import { useState } from 'react'

type PricingStepWizardProps = {
  onComplete: (data: Record<string, unknown>) => void
  onSkip: () => void
}

type PackageDeal = {
  name: string
  priceDollars: string
}

export function PricingStepWizard({ onComplete, onSkip }: PricingStepWizardProps) {
  const [hourlyRate, setHourlyRate] = useState('')
  const [perGuestRate, setPerGuestRate] = useState('')
  const [minimumBooking, setMinimumBooking] = useState('')
  const [packages, setPackages] = useState<PackageDeal[]>([])

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
      pricingConfig.group_rate_3_course_cents = Math.round(parseFloat(perGuestRate) * 100)
    }
    if (minimumBooking) {
      pricingConfig.minimum_booking_cents = Math.round(parseFloat(minimumBooking) * 100)
    }
    if (hourlyRate) {
      pricingConfig.hourly_rate_cents = Math.round(parseFloat(hourlyRate) * 100)
    }

    const validPackages = packages.filter((p) => p.name.trim() && p.priceDollars)
    if (validPackages.length > 0) {
      pricingConfig.add_on_catalog = validPackages.map((p) => ({
        name: p.name.trim(),
        price_cents: Math.round(parseFloat(p.priceDollars) * 100),
        type: 'package',
      }))
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
        {/* Hourly Rate */}
        <div>
          <label htmlFor="hourlyRate" className="block text-sm font-medium text-foreground">
            Hourly Rate
          </label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              $
            </span>
            <input
              id="hourlyRate"
              type="number"
              min="0"
              step="0.01"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="0.00"
              className="block w-full rounded-md border border-border bg-background pl-7 pr-3 py-2 text-foreground shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Per-Guest Rate */}
        <div>
          <label htmlFor="perGuestRate" className="block text-sm font-medium text-foreground">
            Per-Guest Rate
          </label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              $
            </span>
            <input
              id="perGuestRate"
              type="number"
              min="0"
              step="0.01"
              value={perGuestRate}
              onChange={(e) => setPerGuestRate(e.target.value)}
              placeholder="0.00"
              className="block w-full rounded-md border border-border bg-background pl-7 pr-3 py-2 text-foreground shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Price per person for a standard dinner
          </p>
        </div>

        {/* Minimum Booking */}
        <div>
          <label htmlFor="minimumBooking" className="block text-sm font-medium text-foreground">
            Minimum Booking Amount
          </label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              $
            </span>
            <input
              id="minimumBooking"
              type="number"
              min="0"
              step="0.01"
              value={minimumBooking}
              onChange={(e) => setMinimumBooking(e.target.value)}
              placeholder="0.00"
              className="block w-full rounded-md border border-border bg-background pl-7 pr-3 py-2 text-foreground shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
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
              <div className="relative w-28">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground text-sm">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pkg.priceDollars}
                  onChange={(e) => updatePackage(i, 'priceDollars', e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-md border border-border bg-background pl-7 pr-3 py-2 text-sm text-foreground shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
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
