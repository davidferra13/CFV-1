'use client'

import { useCallback } from 'react'
import type { ComponentType } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  BriefcaseBusiness,
  ChefHat,
  Moon,
  Salad,
  Users,
  Utensils,
  UtensilsCrossed,
  Wine,
} from 'lucide-react'
import { DiscoveryViewModeToggle } from './discovery-view-mode-toggle'

type IntentChip = {
  value: string
  label: string
  Icon: ComponentType<{ className?: string }>
}

const INTENT_CHIPS: IntentChip[] = [
  { value: 'tonight', label: 'Tonight', Icon: Moon },
  { value: 'dinner_party', label: 'Dinner Party', Icon: UtensilsCrossed },
  { value: 'meal_prep', label: 'Meal Prep', Icon: Salad },
  { value: 'private_chef', label: 'Private Chef', Icon: ChefHat },
  { value: 'going_out', label: 'Going Out', Icon: Wine },
  { value: 'team_dinner', label: 'Team Dinner', Icon: Users },
  { value: 'work_lunch', label: 'Work Lunch', Icon: BriefcaseBusiness },
]

const BUDGET_OPTIONS = ['Under $30/person', '$30-60/person', '$60-100/person', '$100+/person']

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Kosher',
  'Halal',
  'Paleo',
  'Keto',
]

const EVENT_STYLE_OPTIONS = [
  'Sit-down dinner',
  'Cocktail party',
  'Buffet',
  'Family style',
  'Tasting menu',
  'Cooking class',
]

export function ConsumerIntentFilters({
  activeIntent,
  visualMode,
}: {
  activeIntent: string | null
  visualMode: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      const query = params.toString()
      router.push(query ? `/eat?${query}` : '/eat', { scroll: false })
    },
    [router, searchParams]
  )

  const toggleIntent = useCallback(
    (value: string) => {
      const nextValue = activeIntent === value ? null : value
      const params = new URLSearchParams(searchParams.toString())

      if (nextValue) {
        params.set('intent', nextValue)
        if (nextValue === 'team_dinner') {
          params.set('useCase', 'team')
          if (!params.get('partySize')) params.set('partySize', '8')
        }
        if (nextValue === 'work_lunch') {
          params.set('useCase', 'work')
          if (!params.get('partySize')) params.set('partySize', '10')
        }
      } else {
        params.delete('intent')
      }

      const query = params.toString()
      router.push(query ? `/eat?${query}` : '/eat', { scroll: false })
    },
    [activeIntent, router, searchParams]
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" aria-label="Discovery intent">
        {INTENT_CHIPS.map((chip) => {
          const selected = activeIntent === chip.value
          const Icon = chip.Icon
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => toggleIntent(chip.value)}
              className={[
                'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors',
                selected
                  ? 'border-brand-500 bg-brand-500/20 text-brand-100'
                  : 'border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-500 hover:text-stone-100',
              ].join(' ')}
              aria-pressed={selected}
            >
              <Icon className="h-4 w-4" />
              {chip.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterSelect
          label="Budget"
          paramKey="budget"
          options={BUDGET_OPTIONS}
          searchParams={searchParams}
          setParam={setParam}
        />
        <FilterSelect
          label="Dietary"
          paramKey="dietary"
          options={DIETARY_OPTIONS}
          searchParams={searchParams}
          setParam={setParam}
        />
        <FilterSelect
          label="Event Style"
          paramKey="eventStyle"
          options={EVENT_STYLE_OPTIONS}
          searchParams={searchParams}
          setParam={setParam}
        />
        <FilterInput
          label="Location"
          paramKey="location"
          placeholder="City or state"
          searchParams={searchParams}
          setParam={setParam}
        />
        <FilterInput
          label="Party Size"
          paramKey="partySize"
          placeholder="Guests"
          searchParams={searchParams}
          setParam={setParam}
          type="number"
        />
        <DiscoveryViewModeToggle visualMode={visualMode} setParam={setParam} />
      </div>

      <div className="relative">
        <Utensils className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
        <input
          type="search"
          value={searchParams.get('craving') || ''}
          onChange={(event) => setParam('craving', event.target.value || null)}
          placeholder="Search by craving, cuisine, chef, or place"
          className="h-12 w-full rounded-2xl border border-stone-700 bg-stone-950 pl-10 pr-4 text-sm text-stone-100 placeholder:text-stone-600 transition-colors focus:border-brand-500 focus:outline-none"
          aria-label="Search by craving, cuisine, chef, or place"
        />
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  paramKey,
  options,
  searchParams,
  setParam,
}: {
  label: string
  paramKey: string
  options: string[]
  searchParams: ReturnType<typeof useSearchParams>
  setParam: (key: string, value: string | null) => void
}) {
  const current = searchParams.get(paramKey)
  return (
    <select
      value={current || ''}
      onChange={(event) => setParam(paramKey, event.target.value || null)}
      className="min-h-10 rounded-full border border-stone-700 bg-stone-900 px-3 text-xs text-stone-300 transition-colors hover:border-stone-500 focus:border-brand-500 focus:outline-none"
      aria-label={label}
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}

function FilterInput({
  label,
  paramKey,
  placeholder,
  searchParams,
  setParam,
  type = 'text',
}: {
  label: string
  paramKey: string
  placeholder: string
  searchParams: ReturnType<typeof useSearchParams>
  setParam: (key: string, value: string | null) => void
  type?: string
}) {
  const current = searchParams.get(paramKey) || ''
  return (
    <input
      type={type}
      min={type === 'number' ? 1 : undefined}
      value={current}
      onChange={(event) => setParam(paramKey, event.target.value || null)}
      placeholder={placeholder}
      className="min-h-10 w-32 rounded-full border border-stone-700 bg-stone-900 px-3 text-xs text-stone-300 placeholder:text-stone-600 transition-colors hover:border-stone-500 focus:border-brand-500 focus:outline-none"
      aria-label={label}
    />
  )
}
