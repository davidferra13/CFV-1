'use client'

import { useState } from 'react'

const CUISINE_OPTIONS = [
  'American', 'French', 'Italian', 'Japanese', 'Mexican', 'Mediterranean',
  'Chinese', 'Indian', 'Thai', 'Korean', 'Spanish', 'Middle Eastern',
  'Caribbean', 'Southern', 'Farm-to-Table', 'Plant-Based', 'Fusion',
  'Pastry & Baking', 'Other',
]

type ProfileStepProps = {
  onComplete: (data: Record<string, unknown>) => void
  onSkip: () => void
}

export function ProfileStep({ onComplete, onSkip }: ProfileStepProps) {
  const [businessName, setBusinessName] = useState('')
  const [cuisines, setCuisines] = useState<string[]>([])
  const [serviceArea, setServiceArea] = useState('')
  const [bio, setBio] = useState('')

  function toggleCuisine(c: string) {
    setCuisines((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onComplete({ businessName, cuisines, serviceArea, bio })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Tell us about your business</h2>
        <p className="mt-1 text-sm text-gray-500">
          This helps clients find you and understand what you offer.
        </p>
      </div>

      <div>
        <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
          Business Name
        </label>
        <input
          id="businessName"
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="e.g. Chef Maria's Kitchen"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cuisine Specialties
        </label>
        <div className="flex flex-wrap gap-2">
          {CUISINE_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleCuisine(c)}
              className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                cuisines.includes(c)
                  ? 'bg-orange-100 border-orange-400 text-orange-800'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="serviceArea" className="block text-sm font-medium text-gray-700">
          Service Area
        </label>
        <input
          id="serviceArea"
          type="text"
          value={serviceArea}
          onChange={(e) => setServiceArea(e.target.value)}
          placeholder="e.g. San Francisco Bay Area, 30-mile radius"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
          Short Bio
        </label>
        <textarea
          id="bio"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell potential clients about yourself, your background, and your approach to cooking..."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
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
