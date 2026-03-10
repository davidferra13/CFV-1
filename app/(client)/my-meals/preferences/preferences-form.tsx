'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { updateMyPreferences } from '@/lib/meal-prep/client-portal-actions'

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Keto',
  'Paleo',
  'Halal',
  'Kosher',
  'Low-Sodium',
  'Low-Carb',
]

const ALLERGY_OPTIONS = [
  'Peanuts',
  'Tree Nuts',
  'Shellfish',
  'Fish',
  'Eggs',
  'Milk',
  'Soy',
  'Wheat',
  'Sesame',
]

const CUISINE_OPTIONS = [
  'Italian',
  'Mexican',
  'Japanese',
  'Thai',
  'Indian',
  'Mediterranean',
  'French',
  'Korean',
  'Chinese',
  'American',
  'Middle Eastern',
  'Caribbean',
]

interface MealPrepPreferencesFormProps {
  initialDietaryRestrictions: string[]
  initialAllergies: string[]
  initialDislikes: string[]
  initialFavoriteCuisines: string[]
  initialSpiceTolerance: number
  initialNotes: string
}

export function MealPrepPreferencesForm({
  initialDietaryRestrictions,
  initialAllergies,
  initialDislikes,
  initialFavoriteCuisines,
  initialSpiceTolerance,
  initialNotes,
}: MealPrepPreferencesFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>(
    initialDietaryRestrictions
  )
  const [allergies, setAllergies] = useState<string[]>(initialAllergies)
  const [dislikes, setDislikes] = useState(initialDislikes.join(', '))
  const [favoriteCuisines, setFavoriteCuisines] = useState<string[]>(initialFavoriteCuisines)
  const [notes, setNotes] = useState(initialNotes)

  function toggleItem(list: string[], item: string, setter: (v: string[]) => void) {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item))
    } else {
      setter([...list, item])
    }
  }

  function handleSave() {
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await updateMyPreferences({
          dietary_restrictions: dietaryRestrictions,
          allergies,
          dislikes: dislikes
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          favorite_cuisines: favoriteCuisines,
          notes: notes || undefined,
        })
        if (result.success) {
          setMessage({ type: 'success', text: 'Preferences saved.' })
          router.refresh()
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to save preferences.' })
        }
      } catch {
        setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
      }
    })
  }

  return (
    <div className="space-y-6">
      {message && (
        <Alert variant={message.type === 'success' ? 'success' : 'error'}>{message.text}</Alert>
      )}

      {/* Dietary Restrictions */}
      <Card className="border-stone-700 bg-stone-900">
        <CardContent className="p-5 space-y-3">
          <h2 className="text-lg font-semibold text-stone-100">Dietary Restrictions</h2>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => toggleItem(dietaryRestrictions, option, setDietaryRestrictions)}
                className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                  dietaryRestrictions.includes(option)
                    ? 'bg-brand-500/20 border-brand-500 text-brand-300'
                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card className="border-stone-700 bg-stone-900">
        <CardContent className="p-5 space-y-3">
          <h2 className="text-lg font-semibold text-stone-100">Allergies</h2>
          <p className="text-stone-500 text-sm">
            Select all that apply. Your chef takes these very seriously.
          </p>
          <div className="flex flex-wrap gap-2">
            {ALLERGY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => toggleItem(allergies, option, setAllergies)}
                className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                  allergies.includes(option)
                    ? 'bg-red-500/20 border-red-500 text-red-300'
                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Favorite Cuisines */}
      <Card className="border-stone-700 bg-stone-900">
        <CardContent className="p-5 space-y-3">
          <h2 className="text-lg font-semibold text-stone-100">Favorite Cuisines</h2>
          <div className="flex flex-wrap gap-2">
            {CUISINE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => toggleItem(favoriteCuisines, option, setFavoriteCuisines)}
                className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                  favoriteCuisines.includes(option)
                    ? 'bg-brand-500/20 border-brand-500 text-brand-300'
                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dislikes */}
      <Card className="border-stone-700 bg-stone-900">
        <CardContent className="p-5 space-y-3">
          <h2 className="text-lg font-semibold text-stone-100">Dislikes</h2>
          <p className="text-stone-500 text-sm">
            List ingredients or dishes you prefer to avoid (comma separated).
          </p>
          <Textarea
            value={dislikes}
            onChange={(e) => setDislikes(e.target.value)}
            placeholder="e.g. cilantro, olives, blue cheese"
            className="bg-stone-800 border-stone-700 text-stone-200"
            rows={2}
          />
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="border-stone-700 bg-stone-900">
        <CardContent className="p-5 space-y-3">
          <h2 className="text-lg font-semibold text-stone-100">Additional Notes</h2>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else your chef should know about your preferences..."
            className="bg-stone-800 border-stone-700 text-stone-200"
            rows={3}
          />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="primary" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
        <Button variant="ghost" onClick={() => router.push('/my-meals')} disabled={isPending}>
          Back to Meal Prep
        </Button>
      </div>
    </div>
  )
}
