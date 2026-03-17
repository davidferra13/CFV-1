'use client'

import { useState, useTransition } from 'react'
import { submitOnboarding } from '@/lib/clients/onboarding-actions'

type Props = {
  token: string
  client: any
  chefName: string
}

const CUISINE_OPTIONS = [
  'Italian',
  'French',
  'Japanese',
  'Mexican',
  'Thai',
  'Indian',
  'Chinese',
  'Mediterranean',
  'American',
  'Korean',
  'Vietnamese',
  'Greek',
  'Spanish',
  'Middle Eastern',
  'Caribbean',
  'Brazilian',
  'Peruvian',
  'Ethiopian',
]

const COMMON_ALLERGENS = [
  'Dairy',
  'Eggs',
  'Fish',
  'Shellfish',
  'Tree Nuts',
  'Peanuts',
  'Wheat',
  'Soy',
  'Sesame',
  'Gluten',
]

export function OnboardingForm({ token, client, chefName }: Props) {
  const [step, setStep] = useState(1)
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>(
    client.dietary_restrictions ?? []
  )
  const [allergies, setAllergies] = useState<
    { allergen: string; severity: 'life_threatening' | 'intolerance' | 'preference' }[]
  >([])
  const [favoriteCuisines, setFavoriteCuisines] = useState<string[]>(client.favorite_cuisines ?? [])
  const [dislikes, setDislikes] = useState<string[]>(client.dislikes ?? [])
  const [spiceTolerance, setSpiceTolerance] = useState(client.spice_tolerance ?? 'medium')
  const [kitchenSize, setKitchenSize] = useState(client.kitchen_size ?? '')
  const [parkingInstructions, setParkingInstructions] = useState(client.parking_instructions ?? '')
  const [accessInstructions, setAccessInstructions] = useState(client.access_instructions ?? '')
  const [preferredContact, setPreferredContact] = useState(
    client.preferred_contact_method ?? 'email'
  )
  const [customDislikes, setCustomDislikes] = useState('')
  const [customDietary, setCustomDietary] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function toggleCuisine(cuisine: string) {
    setFavoriteCuisines((prev) =>
      prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine]
    )
  }

  function addAllergen(allergen: string) {
    if (!allergies.find((a) => a.allergen === allergen)) {
      setAllergies((prev) => [...prev, { allergen, severity: 'intolerance' }])
    }
  }

  function removeAllergen(allergen: string) {
    setAllergies((prev) => prev.filter((a) => a.allergen !== allergen))
  }

  function updateSeverity(
    allergen: string,
    severity: 'life_threatening' | 'intolerance' | 'preference'
  ) {
    setAllergies((prev) => prev.map((a) => (a.allergen === allergen ? { ...a, severity } : a)))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const allDislikes = [...dislikes]
    if (customDislikes.trim()) {
      allDislikes.push(
        ...customDislikes
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean)
      )
    }

    const allDietary = [...dietaryRestrictions]
    if (customDietary.trim()) {
      allDietary.push(
        ...customDietary
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean)
      )
    }

    startTransition(async () => {
      try {
        const result = await submitOnboarding({
          token,
          dietary_restrictions: allDietary.length > 0 ? allDietary : undefined,
          allergies: allergies.length > 0 ? allergies : undefined,
          favorite_cuisines: favoriteCuisines.length > 0 ? favoriteCuisines : undefined,
          dislikes: allDislikes.length > 0 ? allDislikes : undefined,
          spice_tolerance: spiceTolerance,
          kitchen_size: kitchenSize || undefined,
          parking_instructions: parkingInstructions || undefined,
          access_instructions: accessInstructions || undefined,
          preferred_contact_method: preferredContact as 'email' | 'phone' | 'text',
        })

        if (result.success) {
          setSubmitted(true)
        } else {
          setError(result.error ?? 'Failed to save preferences.')
        }
      } catch {
        setError('An unexpected error occurred.')
      }
    })
  }

  if (submitted) {
    return (
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">&#x1F389;</div>
        <h2 className="text-xl font-bold text-stone-100 mb-2">You are all set!</h2>
        <p className="text-stone-400">
          {chefName} now has your preferences on file and will use them to customize every meal and
          event for you. You can update these anytime.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step 1: Dietary & Allergies */}
      {step >= 1 && (
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-stone-100">Dietary Needs & Allergies</h3>

          <div>
            <label className="block text-sm text-stone-300 mb-2">Any dietary restrictions?</label>
            <div className="flex flex-wrap gap-2">
              {[
                'Vegetarian',
                'Vegan',
                'Pescatarian',
                'Kosher',
                'Halal',
                'Gluten-Free',
                'Dairy-Free',
                'Keto',
                'Paleo',
              ].map((diet) => (
                <button
                  key={diet}
                  type="button"
                  onClick={() =>
                    setDietaryRestrictions((prev) =>
                      prev.includes(diet) ? prev.filter((d) => d !== diet) : [...prev, diet]
                    )
                  }
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    dietaryRestrictions.includes(diet)
                      ? 'bg-amber-900/50 border-amber-700 text-amber-300'
                      : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                  }`}
                >
                  {diet}
                </button>
              ))}
            </div>
            <input
              value={customDietary}
              onChange={(e) => setCustomDietary(e.target.value)}
              placeholder="Other (comma separated)"
              className="mt-2 w-full bg-stone-800 border border-stone-700 rounded px-3 py-1.5 text-stone-100 text-sm placeholder-stone-500"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-300 mb-2">Any allergies?</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {COMMON_ALLERGENS.map((allergen) => (
                <button
                  key={allergen}
                  type="button"
                  onClick={() =>
                    allergies.find((a) => a.allergen === allergen)
                      ? removeAllergen(allergen)
                      : addAllergen(allergen)
                  }
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    allergies.find((a) => a.allergen === allergen)
                      ? 'bg-red-900/50 border-red-700 text-red-300'
                      : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                  }`}
                >
                  {allergen}
                </button>
              ))}
            </div>
            {allergies.length > 0 && (
              <div className="space-y-2 mt-3">
                {allergies.map((a) => (
                  <div
                    key={a.allergen}
                    className="flex items-center gap-3 p-2 bg-stone-800 rounded"
                  >
                    <span className="text-sm text-stone-200 w-24">{a.allergen}</span>
                    <select
                      value={a.severity}
                      onChange={(e) => updateSeverity(a.allergen, e.target.value as any)}
                      className="bg-stone-900 border border-stone-700 rounded px-2 py-1 text-sm text-stone-100"
                    >
                      <option value="life_threatening">Life-threatening</option>
                      <option value="intolerance">Intolerance</option>
                      <option value="preference">Preference</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeAllergen(a.allergen)}
                      className="text-stone-500 hover:text-red-400 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Preferences */}
      {step >= 1 && (
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-stone-100">Food Preferences</h3>

          <div>
            <label className="block text-sm text-stone-300 mb-2">Favorite cuisines</label>
            <div className="flex flex-wrap gap-2">
              {CUISINE_OPTIONS.map((cuisine) => (
                <button
                  key={cuisine}
                  type="button"
                  onClick={() => toggleCuisine(cuisine)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    favoriteCuisines.includes(cuisine)
                      ? 'bg-amber-900/50 border-amber-700 text-amber-300'
                      : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                  }`}
                >
                  {cuisine}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-stone-300 mb-2">Spice tolerance</label>
            <div className="flex gap-2">
              {[
                { value: 'none', label: 'No spice' },
                { value: 'mild', label: 'Mild' },
                { value: 'medium', label: 'Medium' },
                { value: 'hot', label: 'Hot' },
                { value: 'very_hot', label: 'Very Hot' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSpiceTolerance(opt.value)}
                  className={`px-3 py-1 rounded text-sm border transition-colors ${
                    spiceTolerance === opt.value
                      ? 'bg-amber-900/50 border-amber-700 text-amber-300'
                      : 'bg-stone-800 border-stone-700 text-stone-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-stone-300 mb-1">
              Anything you really dislike?
            </label>
            <input
              value={customDislikes}
              onChange={(e) => setCustomDislikes(e.target.value)}
              placeholder="e.g., cilantro, blue cheese, liver (comma separated)"
              className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-1.5 text-stone-100 text-sm placeholder-stone-500"
            />
          </div>
        </div>
      )}

      {/* Step 3: Logistics */}
      {step >= 1 && (
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-stone-100">Kitchen & Logistics (optional)</h3>

          <div>
            <label className="block text-sm text-stone-300 mb-1">Kitchen size</label>
            <select
              value={kitchenSize}
              onChange={(e) => setKitchenSize(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-1.5 text-stone-100 text-sm"
            >
              <option value="">Select...</option>
              <option value="small">Small (apartment-sized)</option>
              <option value="medium">Medium (standard home)</option>
              <option value="large">Large (spacious / chef's kitchen)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-stone-300 mb-1">Parking instructions</label>
            <input
              value={parkingInstructions}
              onChange={(e) => setParkingInstructions(e.target.value)}
              placeholder="Where should the chef park?"
              className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-1.5 text-stone-100 text-sm placeholder-stone-500"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-300 mb-1">Access instructions</label>
            <input
              value={accessInstructions}
              onChange={(e) => setAccessInstructions(e.target.value)}
              placeholder="Gate codes, door bell, etc."
              className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-1.5 text-stone-100 text-sm placeholder-stone-500"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-300 mb-1">Preferred contact method</label>
            <div className="flex gap-2">
              {['email', 'phone', 'text'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPreferredContact(method)}
                  className={`px-4 py-1.5 rounded text-sm border capitalize transition-colors ${
                    preferredContact === method
                      ? 'bg-amber-900/50 border-amber-700 text-amber-300'
                      : 'bg-stone-800 border-stone-700 text-stone-400'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {pending ? 'Saving...' : 'Save My Preferences'}
      </button>
    </form>
  )
}
