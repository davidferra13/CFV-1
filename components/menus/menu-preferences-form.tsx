'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const CUISINE_OPTIONS = [
  'Italian',
  'French',
  'Mediterranean',
  'Japanese',
  'Mexican',
  'American',
  'Thai',
  'Indian',
  'Chinese',
  'Korean',
  'Spanish',
  'Greek',
  'Middle Eastern',
  'Southern',
  'Fusion',
]

const SERVICE_STYLES = [
  { value: 'plated', label: 'Plated' },
  { value: 'family_style', label: 'Family Style' },
  { value: 'buffet', label: 'Buffet' },
  { value: 'cocktail', label: 'Cocktail / Passed' },
  { value: 'tasting_menu', label: 'Tasting Menu' },
]

type MenuPreferencesFormProps = {
  onSubmit: (data: {
    cuisinePreferences: string[]
    serviceStylePref: string
    foodsLove: string
    foodsAvoid: string
    specialRequests: string
    adventurousness: 'classic' | 'balanced' | 'adventurous'
  }) => void
  loading?: boolean
  initialData?: {
    cuisinePreferences?: string[]
    serviceStylePref?: string
    foodsLove?: string
    foodsAvoid?: string
    specialRequests?: string
    adventurousness?: string
  }
}

export function MenuPreferencesForm({ onSubmit, loading, initialData }: MenuPreferencesFormProps) {
  const [cuisines, setCuisines] = useState<string[]>(initialData?.cuisinePreferences ?? [])
  const [serviceStyle, setServiceStyle] = useState(initialData?.serviceStylePref ?? '')
  const [foodsLove, setFoodsLove] = useState(initialData?.foodsLove ?? '')
  const [foodsAvoid, setFoodsAvoid] = useState(initialData?.foodsAvoid ?? '')
  const [specialRequests, setSpecialRequests] = useState(initialData?.specialRequests ?? '')
  const [adventurousness, setAdventurousness] = useState<'classic' | 'balanced' | 'adventurous'>(
    (initialData?.adventurousness as 'classic' | 'balanced' | 'adventurous') ?? 'balanced'
  )

  const toggleCuisine = (c: string) => {
    setCuisines((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      cuisinePreferences: cuisines,
      serviceStylePref: serviceStyle,
      foodsLove,
      foodsAvoid,
      specialRequests,
      adventurousness,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cuisine preferences */}
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-2">
          What cuisines interest you?{' '}
          <span className="text-stone-500">(pick as many as you like)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {CUISINE_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleCuisine(c)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                cuisines.includes(c)
                  ? 'border-brand-500 bg-brand-950/40 text-brand-300'
                  : 'border-stone-700 bg-stone-800 text-stone-400 hover:border-stone-500'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Service style */}
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-2">
          Service style preference
        </label>
        <div className="flex flex-wrap gap-2">
          {SERVICE_STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setServiceStyle(serviceStyle === s.value ? '' : s.value)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                serviceStyle === s.value
                  ? 'border-brand-500 bg-brand-950/40 text-brand-300'
                  : 'border-stone-700 bg-stone-800 text-stone-400 hover:border-stone-500'
              }`}
            >
              {s.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setServiceStyle('')}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${
              serviceStyle === ''
                ? 'border-brand-500 bg-brand-950/40 text-brand-300'
                : 'border-stone-700 bg-stone-800 text-stone-400 hover:border-stone-500'
            }`}
          >
            No preference
          </button>
        </div>
      </div>

      {/* Adventurousness */}
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-2">
          How adventurous are you?
        </label>
        <div className="flex gap-2">
          {[
            { value: 'classic' as const, label: 'Keep it classic', desc: 'Familiar favorites' },
            { value: 'balanced' as const, label: 'Open-minded', desc: 'Mix of familiar & new' },
            {
              value: 'adventurous' as const,
              label: 'Surprise me!',
              desc: 'Chef has full creative freedom',
            },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAdventurousness(opt.value)}
              className={`flex-1 rounded-lg border p-3 text-left transition ${
                adventurousness === opt.value
                  ? 'border-brand-500 bg-brand-950/40'
                  : 'border-stone-700 bg-stone-800 hover:border-stone-500'
              }`}
            >
              <span
                className={`text-sm font-medium ${adventurousness === opt.value ? 'text-brand-300' : 'text-stone-300'}`}
              >
                {opt.label}
              </span>
              <span className="block text-xs text-stone-500 mt-0.5">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Foods love */}
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1">Foods you love</label>
        <textarea
          value={foodsLove}
          onChange={(e) => setFoodsLove(e.target.value)}
          placeholder="e.g., Truffle, fresh pasta, anything with mushrooms, seafood..."
          rows={2}
          className="w-full rounded-lg border border-stone-700 bg-stone-800 p-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Foods avoid */}
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1">Foods to avoid</label>
        <textarea
          value={foodsAvoid}
          onChange={(e) => setFoodsAvoid(e.target.value)}
          placeholder="e.g., No olives, no blue cheese, shellfish allergy..."
          rows={2}
          className="w-full rounded-lg border border-stone-700 bg-stone-800 p-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Special requests */}
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1">
          Any special requests?
        </label>
        <textarea
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="e.g., Birthday celebration, want a wow-factor dessert, one vegetarian guest..."
          rows={2}
          className="w-full rounded-lg border border-stone-700 bg-stone-800 p-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <Button type="submit" variant="primary" disabled={loading} className="w-full">
        {loading ? 'Sending...' : 'Send Preferences to Chef'}
      </Button>
    </form>
  )
}
