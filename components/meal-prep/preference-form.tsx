'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check } from '@/components/ui/icons'
import type { MealPrepPreferences } from '@/lib/meal-prep/preference-questionnaire-actions'
import { saveClientMealPrepPreferences } from '@/lib/meal-prep/preference-questionnaire-actions'

// ============================================
// Option lists
// ============================================

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Halal',
  'Kosher',
  'Pescatarian',
  'Low-Sodium',
]

const ALLERGY_OPTIONS = [
  'Nuts',
  'Peanuts',
  'Shellfish',
  'Fish',
  'Eggs',
  'Soy',
  'Wheat',
  'Sesame',
  'Milk',
]

const CUISINE_OPTIONS = [
  'Italian',
  'Mexican',
  'Asian',
  'Mediterranean',
  'American',
  'Indian',
  'Thai',
  'Japanese',
  'French',
  'Middle Eastern',
  'Korean',
  'Caribbean',
]

const PROTEIN_OPTIONS = [
  'Chicken',
  'Beef',
  'Pork',
  'Fish',
  'Shrimp',
  'Tofu',
  'Tempeh',
  'Turkey',
  'Lamb',
  'Eggs',
]

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ============================================
// Props
// ============================================

interface PreferenceFormProps {
  clientId: string
  clientName: string
  initialPreferences: MealPrepPreferences | null
}

// ============================================
// Component
// ============================================

export function PreferenceForm({ clientId, clientName, initialPreferences }: PreferenceFormProps) {
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState<MealPrepPreferences>(
    initialPreferences ?? {
      dietary_restrictions: [],
      allergies: [],
      dislikes: '',
      spice_tolerance: 'medium',
      favorite_cuisines: [],
      dietary_protocols: '',
      household_size: 1,
      adults: 1,
      children: 0,
      meals_per_week: 5,
      preferred_proteins: [],
      avoid_proteins: [],
      carb_preference: 'normal',
      portion_size: 'regular',
      delivery_address: '',
      delivery_instructions: '',
      preferred_delivery_day: 1,
      delivery_window: 'morning',
      container_preference: 'reusable',
      weekly_budget_cents: null,
      notes: '',
    }
  )

  function toggleArrayItem(field: keyof MealPrepPreferences, value: string) {
    setForm((prev) => {
      const arr = prev[field] as string[]
      const updated = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
      return { ...prev, [field]: updated }
    })
  }

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        const result = await saveClientMealPrepPreferences(clientId, form)
        if (result.error) {
          setError(result.error)
          return
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch {
        setError('Failed to save preferences')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-200">Meal Prep Preferences</h2>
          <p className="text-sm text-stone-500">{clientName}</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-sm text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4" />
              Saved
            </span>
          )}
          <Button variant="primary" size="sm" disabled={pending} onClick={handleSave}>
            Save Preferences
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/50 border border-red-800 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Dietary Section */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wide">Dietary</h3>

        <div>
          <label className="text-xs text-stone-500 block mb-2">Dietary Restrictions</label>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => toggleArrayItem('dietary_restrictions', opt.toLowerCase())}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  form.dietary_restrictions.includes(opt.toLowerCase())
                    ? 'bg-amber-900/50 border-amber-700 text-amber-300'
                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-stone-500 block mb-2">Allergies</label>
          <div className="flex flex-wrap gap-2">
            {ALLERGY_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => toggleArrayItem('allergies', opt.toLowerCase())}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  form.allergies.includes(opt.toLowerCase())
                    ? 'bg-red-900/50 border-red-700 text-red-300'
                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-stone-500 block mb-1">Dislikes</label>
          <textarea
            value={form.dislikes}
            onChange={(e) => setForm((p) => ({ ...p, dislikes: e.target.value }))}
            placeholder="Foods or ingredients the client dislikes"
            rows={2}
            className="w-full px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200 resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-stone-500 block mb-1">Spice Tolerance</label>
          <div className="flex gap-2">
            {(['none', 'mild', 'medium', 'hot'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setForm((p) => ({ ...p, spice_tolerance: level }))}
                className={`px-4 py-2 text-sm rounded-lg border transition-colors capitalize ${
                  form.spice_tolerance === level
                    ? 'bg-amber-900/50 border-amber-700 text-amber-300'
                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-stone-500 block mb-2">Favorite Cuisines</label>
          <div className="flex flex-wrap gap-2">
            {CUISINE_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => toggleArrayItem('favorite_cuisines', opt.toLowerCase())}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  form.favorite_cuisines.includes(opt.toLowerCase())
                    ? 'bg-emerald-900/50 border-emerald-700 text-emerald-300'
                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-stone-500 block mb-1">Dietary Protocols</label>
          <input
            type="text"
            value={form.dietary_protocols}
            onChange={(e) => setForm((p) => ({ ...p, dietary_protocols: e.target.value }))}
            placeholder="e.g. Keto, Paleo, Whole30, Zone"
            className="w-full px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200"
          />
        </div>
      </Card>

      {/* Household Section */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wide">Household</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-stone-500 block mb-1">Household Size</label>
            <input
              type="number"
              min={1}
              value={form.household_size}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  household_size: Math.max(1, parseInt(e.target.value) || 1),
                }))
              }
              className="w-full px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200"
            />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Adults</label>
            <input
              type="number"
              min={0}
              value={form.adults}
              onChange={(e) =>
                setForm((p) => ({ ...p, adults: Math.max(0, parseInt(e.target.value) || 0) }))
              }
              className="w-full px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200"
            />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Children</label>
            <input
              type="number"
              min={0}
              value={form.children}
              onChange={(e) =>
                setForm((p) => ({ ...p, children: Math.max(0, parseInt(e.target.value) || 0) }))
              }
              className="w-full px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200"
            />
          </div>
        </div>
      </Card>

      {/* Meal Preferences Section */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wide">
          Meal Preferences
        </h3>

        <div>
          <label className="text-xs text-stone-500 block mb-1">Meals Per Week</label>
          <input
            type="number"
            min={1}
            max={21}
            value={form.meals_per_week}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                meals_per_week: Math.min(21, Math.max(1, parseInt(e.target.value) || 1)),
              }))
            }
            className="w-32 px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200"
          />
        </div>

        <div>
          <label className="text-xs text-stone-500 block mb-2">Preferred Proteins</label>
          <div className="flex flex-wrap gap-2">
            {PROTEIN_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => toggleArrayItem('preferred_proteins', opt.toLowerCase())}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  form.preferred_proteins.includes(opt.toLowerCase())
                    ? 'bg-emerald-900/50 border-emerald-700 text-emerald-300'
                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-stone-500 block mb-2">Proteins to Avoid</label>
          <div className="flex flex-wrap gap-2">
            {PROTEIN_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => toggleArrayItem('avoid_proteins', opt.toLowerCase())}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  form.avoid_proteins.includes(opt.toLowerCase())
                    ? 'bg-red-900/50 border-red-700 text-red-300'
                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-stone-500 block mb-1">Carb Preference</label>
          <div className="flex gap-2">
            {(['normal', 'low_carb', 'no_carb'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setForm((p) => ({ ...p, carb_preference: opt }))}
                className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                  form.carb_preference === opt
                    ? 'bg-amber-900/50 border-amber-700 text-amber-300'
                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                }`}
              >
                {opt === 'normal' ? 'Normal' : opt === 'low_carb' ? 'Low Carb' : 'No Carb'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-stone-500 block mb-1">Portion Size</label>
          <div className="flex gap-2">
            {(['small', 'regular', 'large'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setForm((p) => ({ ...p, portion_size: opt }))}
                className={`px-4 py-2 text-sm rounded-lg border transition-colors capitalize ${
                  form.portion_size === opt
                    ? 'bg-amber-900/50 border-amber-700 text-amber-300'
                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Delivery Section */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wide">Delivery</h3>

        <div>
          <label className="text-xs text-stone-500 block mb-1">Delivery Address</label>
          <input
            type="text"
            value={form.delivery_address}
            onChange={(e) => setForm((p) => ({ ...p, delivery_address: e.target.value }))}
            placeholder="Full delivery address"
            className="w-full px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200"
          />
        </div>

        <div>
          <label className="text-xs text-stone-500 block mb-1">Delivery Instructions</label>
          <textarea
            value={form.delivery_instructions}
            onChange={(e) => setForm((p) => ({ ...p, delivery_instructions: e.target.value }))}
            placeholder="Gate code, leave at door, ring bell, etc."
            rows={2}
            className="w-full px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-stone-500 block mb-1">Preferred Delivery Day</label>
            <select
              value={form.preferred_delivery_day}
              onChange={(e) =>
                setForm((p) => ({ ...p, preferred_delivery_day: parseInt(e.target.value) }))
              }
              className="w-full px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200"
            >
              {DAY_NAMES.map((name, i) => (
                <option key={i} value={i}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Delivery Window</label>
            <select
              value={form.delivery_window}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  delivery_window: e.target.value as 'morning' | 'afternoon' | 'evening',
                }))
              }
              className="w-full px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200"
            >
              <option value="morning">Morning (8am - 12pm)</option>
              <option value="afternoon">Afternoon (12pm - 5pm)</option>
              <option value="evening">Evening (5pm - 9pm)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-stone-500 block mb-1">Container Preference</label>
          <div className="flex gap-2">
            {(['reusable', 'disposable'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setForm((p) => ({ ...p, container_preference: opt }))}
                className={`px-4 py-2 text-sm rounded-lg border transition-colors capitalize ${
                  form.container_preference === opt
                    ? 'bg-amber-900/50 border-amber-700 text-amber-300'
                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Budget & Notes Section */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wide">
          Budget & Notes
        </h3>

        <div>
          <label className="text-xs text-stone-500 block mb-1">Weekly Budget ($)</label>
          <input
            type="text"
            value={form.weekly_budget_cents ? (form.weekly_budget_cents / 100).toFixed(2) : ''}
            onChange={(e) => {
              const val = e.target.value
              setForm((p) => ({
                ...p,
                weekly_budget_cents: val ? Math.round(parseFloat(val) * 100) || null : null,
              }))
            }}
            placeholder="No budget set"
            className="w-48 px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200"
          />
        </div>

        <div>
          <label className="text-xs text-stone-500 block mb-1">Additional Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Any other preferences or requirements"
            rows={3}
            className="w-full px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200 resize-none"
          />
        </div>
      </Card>

      {/* Bottom save button */}
      <div className="flex justify-end">
        <Button variant="primary" disabled={pending} onClick={handleSave}>
          Save Preferences
        </Button>
      </div>
    </div>
  )
}
