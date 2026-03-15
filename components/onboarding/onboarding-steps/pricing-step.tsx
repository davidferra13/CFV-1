'use client'

import { useState } from 'react'

const PRESETS = [
  { label: 'Getting Started', range: '$45 - $65/hr', hourly: 55, perPerson: 35, minimum: 200 },
  { label: 'Established', range: '$75 - $125/hr', hourly: 100, perPerson: 55, minimum: 500 },
  { label: 'Premium', range: '$150+/hr', hourly: 175, perPerson: 85, minimum: 1000 },
]

type PricingStepProps = {
  onComplete: (data: Record<string, unknown>) => void
  onSkip: () => void
}

export function PricingStep({ onComplete, onSkip }: PricingStepProps) {
  const [hourlyRate, setHourlyRate] = useState('')
  const [perPersonRate, setPerPersonRate] = useState('')
  const [minimumBooking, setMinimumBooking] = useState('')

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setHourlyRate(String(preset.hourly))
    setPerPersonRate(String(preset.perPerson))
    setMinimumBooking(String(preset.minimum))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onComplete({
      hourlyRateCents: Math.round(Number(hourlyRate) * 100),
      perPersonRateCents: Math.round(Number(perPersonRate) * 100),
      minimumBookingCents: Math.round(Number(minimumBooking) * 100),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Set your pricing</h2>
        <p className="mt-1 text-sm text-gray-500">
          These are your starting rates. You can adjust per-event and change these anytime.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Quick Presets</label>
        <div className="grid grid-cols-3 gap-3">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              className="rounded-lg border border-gray-200 p-3 text-center hover:border-orange-400 hover:bg-orange-50 transition-colors"
            >
              <div className="text-sm font-medium text-gray-900">{p.label}</div>
              <div className="text-xs text-gray-500">{p.range}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700">
            Hourly Rate ($)
          </label>
          <input
            id="hourlyRate"
            type="number"
            min="0"
            step="5"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="100"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div>
          <label htmlFor="perPersonRate" className="block text-sm font-medium text-gray-700">
            Per Person ($)
          </label>
          <input
            id="perPersonRate"
            type="number"
            min="0"
            step="5"
            value={perPersonRate}
            onChange={(e) => setPerPersonRate(e.target.value)}
            placeholder="55"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div>
          <label htmlFor="minimumBooking" className="block text-sm font-medium text-gray-700">
            Minimum ($)
          </label>
          <input
            id="minimumBooking"
            type="number"
            min="0"
            step="50"
            value={minimumBooking}
            onChange={(e) => setMinimumBooking(e.target.value)}
            placeholder="500"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          I'll do this later
        </button>
        <button
          type="submit"
          className="rounded-md bg-orange-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          Continue
        </button>
      </div>
    </form>
  )
}
