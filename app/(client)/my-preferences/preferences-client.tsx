'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, X, Info } from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import {
  updateMyPreferences,
  type ClientPreferences,
} from '@/lib/preferences/client-preference-actions'

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Kosher',
  'Halal',
  'Pescatarian',
  'Keto',
  'Paleo',
  'Low-Sodium',
  'Nut-Free',
  'Egg-Free',
]

const CUISINE_OPTIONS = [
  'Italian',
  'French',
  'Japanese',
  'Mexican',
  'Indian',
  'Thai',
  'Mediterranean',
  'American',
  'Chinese',
  'Korean',
  'Middle Eastern',
  'Greek',
]

const SPICE_LEVELS = [
  { value: '', label: 'No preference' },
  { value: 'mild', label: 'Mild' },
  { value: 'medium', label: 'Medium' },
  { value: 'hot', label: 'Hot' },
  { value: 'extra_hot', label: 'Extra Hot' },
]

const TEXTURE_OPTIONS = [
  'Mushy',
  'Slimy',
  'Rubbery',
  'Gritty',
  'Chewy',
  'Crunchy (avoid)',
  'Gelatinous',
]

const PORTION_LEVELS = [
  { value: '', label: 'No preference' },
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'hearty', label: 'Hearty' },
]

const ALCOHOL_OPTIONS = [
  { value: '', label: 'No preference' },
  { value: 'none', label: 'No alcohol' },
  { value: 'wine_pairing', label: 'Wine pairing' },
  { value: 'cocktails', label: 'Cocktails' },
  { value: 'beer', label: 'Beer' },
  { value: 'open_bar', label: 'Open bar' },
  { value: 'byob', label: 'BYOB' },
]

const COOKING_STYLE_OPTIONS = [
  { value: '', label: 'No preference' },
  { value: 'rare_ok', label: 'Rare OK' },
  { value: 'medium_preferred', label: 'Medium preferred' },
  { value: 'well_done', label: 'Well done' },
  { value: 'no_raw', label: 'No raw foods' },
]

export function PreferencesClient({
  initialPreferences,
}: {
  initialPreferences: ClientPreferences
}) {
  const [prefs, setPrefs] = useState(initialPreferences)
  const [allergyInput, setAllergyInput] = useState('')
  const [dislikeInput, setDislikeInput] = useState('')
  const [favoriteInput, setFavoriteInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function toggleItem(
    field: 'dietary_restrictions' | 'cuisine_preferences' | 'texture_aversions',
    item: string
  ) {
    setPrefs((p) => ({
      ...p,
      [field]: p[field].includes(item) ? p[field].filter((i) => i !== item) : [...p[field], item],
    }))
  }

  function addToList(field: 'allergies' | 'dislikes' | 'favorites', value: string) {
    const trimmed = value.trim()
    if (trimmed && !prefs[field].includes(trimmed)) {
      setPrefs((p) => ({ ...p, [field]: [...p[field], trimmed] }))
    }
  }

  function removeFromList(field: 'allergies' | 'dislikes' | 'favorites', item: string) {
    setPrefs((p) => ({ ...p, [field]: p[field].filter((i) => i !== item) }))
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateMyPreferences(prefs)
        toast.success('Preferences saved')
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || 'Failed to save')
      }
    })
  }

  return (
    <div className="space-y-6">
      <Alert variant="info" className="flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Changes here are shared with your chef for all future events.</span>
      </Alert>

      {/* Dietary Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle>Dietary Restrictions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((opt) => {
              const active = prefs.dietary_restrictions.includes(opt)
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleItem('dietary_restrictions', opt)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-600 text-white'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card>
        <CardHeader>
          <CardTitle>Allergies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {prefs.allergies.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {prefs.allergies.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-950/50 text-red-300 border border-red-800/50"
                >
                  {a}
                  <button
                    type="button"
                    onClick={() => removeFromList('allergies', a)}
                    className="hover:text-red-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={allergyInput}
              onChange={(e) => setAllergyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addToList('allergies', allergyInput)
                  setAllergyInput('')
                }
              }}
              className="flex-1 rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="Type an allergy and press Enter"
            />
            <button
              type="button"
              onClick={() => {
                addToList('allergies', allergyInput)
                setAllergyInput('')
              }}
              className="px-3 py-2 rounded-lg bg-stone-700 text-stone-300 text-sm hover:bg-stone-600"
            >
              Add
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Spice Tolerance */}
      <Card>
        <CardHeader>
          <CardTitle>Spice Tolerance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SPICE_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, spice_tolerance: level.value || null }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  (prefs.spice_tolerance || '') === level.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Texture Aversions */}
      <Card>
        <CardHeader>
          <CardTitle>Texture Aversions</CardTitle>
          <p className="text-xs text-stone-500 mt-1">Textures you prefer to avoid</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TEXTURE_OPTIONS.map((opt) => {
              const active = prefs.texture_aversions.includes(opt)
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleItem('texture_aversions', opt)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-600 text-white'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Portion Size */}
      <Card>
        <CardHeader>
          <CardTitle>Portion Size</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PORTION_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, portion_preference: level.value || null }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  (prefs.portion_preference || '') === level.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alcohol Preference */}
      <Card>
        <CardHeader>
          <CardTitle>Alcohol Preference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ALCOHOL_OPTIONS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, alcohol_preference: level.value || null }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  (prefs.alcohol_preference || '') === level.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cooking Style */}
      <Card>
        <CardHeader>
          <CardTitle>Cooking Style</CardTitle>
          <p className="text-xs text-stone-500 mt-1">How do you prefer your proteins cooked?</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {COOKING_STYLE_OPTIONS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() =>
                  setPrefs((p) => ({ ...p, cooking_style_preference: level.value || null }))
                }
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  (prefs.cooking_style_preference || '') === level.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cuisine Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Cuisine Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {CUISINE_OPTIONS.map((opt) => {
              const active = prefs.cuisine_preferences.includes(opt)
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleItem('cuisine_preferences', opt)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-600 text-white'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dislikes */}
      <Card>
        <CardHeader>
          <CardTitle>Dislikes</CardTitle>
          <p className="text-xs text-stone-500 mt-1">
            Ingredients or foods you prefer to avoid (not allergies)
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {prefs.dislikes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {prefs.dislikes.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-stone-800 text-stone-300"
                >
                  {d}
                  <button
                    type="button"
                    onClick={() => removeFromList('dislikes', d)}
                    className="hover:text-stone-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={dislikeInput}
              onChange={(e) => setDislikeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addToList('dislikes', dislikeInput)
                  setDislikeInput('')
                }
              }}
              className="flex-1 rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="e.g. cilantro, anchovies"
            />
            <button
              type="button"
              onClick={() => {
                addToList('dislikes', dislikeInput)
                setDislikeInput('')
              }}
              className="px-3 py-2 rounded-lg bg-stone-700 text-stone-300 text-sm hover:bg-stone-600"
            >
              Add
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Favorites */}
      <Card>
        <CardHeader>
          <CardTitle>Favorites</CardTitle>
          <p className="text-xs text-stone-500 mt-1">Foods and ingredients you love</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {prefs.favorites.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {prefs.favorites.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-emerald-950/50 text-emerald-300 border border-emerald-800/50"
                >
                  {f}
                  <button
                    type="button"
                    onClick={() => removeFromList('favorites', f)}
                    className="hover:text-emerald-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={favoriteInput}
              onChange={(e) => setFavoriteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addToList('favorites', favoriteInput)
                  setFavoriteInput('')
                }
              }}
              className="flex-1 rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="e.g. truffle, lobster, dark chocolate"
            />
            <button
              type="button"
              onClick={() => {
                addToList('favorites', favoriteInput)
                setFavoriteInput('')
              }}
              className="px-3 py-2 rounded-lg bg-stone-700 text-stone-300 text-sm hover:bg-stone-600"
            >
              Add
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isPending ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  )
}
