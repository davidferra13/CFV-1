'use client'

import { useState } from 'react'

const SERVICE_OPTIONS = [
  {
    key: 'private_dining',
    label: 'Private Dining',
    description: 'In-home multi-course dinners for intimate gatherings',
  },
  {
    key: 'meal_prep',
    label: 'Meal Prep',
    description: 'Weekly meal preparation and delivery for busy households',
  },
  {
    key: 'catering',
    label: 'Catering',
    description: 'Large-scale events, parties, and corporate functions',
  },
  {
    key: 'cooking_classes',
    label: 'Cooking Classes',
    description: 'Group or private cooking lessons and team-building events',
  },
  {
    key: 'personal_chef',
    label: 'Personal Chef',
    description: 'Ongoing, recurring service for individual clients or families',
  },
]

type ServicesStepProps = {
  onComplete: (data: Record<string, unknown>) => void
  onSkip: () => void
}

export function ServicesStep({ onComplete, onSkip }: ServicesStepProps) {
  const [selected, setSelected] = useState<string[]>([])

  function toggle(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onComplete({ services: selected })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">What services do you offer?</h2>
        <p className="mt-1 text-sm text-gray-500">
          Select all that apply. You can always change this later.
        </p>
      </div>

      <div className="space-y-3">
        {SERVICE_OPTIONS.map((svc) => (
          <label
            key={svc.key}
            className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
              selected.includes(svc.key)
                ? 'border-orange-400 bg-orange-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(svc.key)}
              onChange={() => toggle(svc.key)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            <div>
              <div className="font-medium text-gray-900">{svc.label}</div>
              <div className="text-sm text-gray-500">{svc.description}</div>
            </div>
          </label>
        ))}
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
