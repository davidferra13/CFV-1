'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AllergyPicker } from '@/components/ui/allergy-picker'

type ClientPreferencesValues = {
  dietary_restrictions?: string[] | null
  allergies?: string[] | null
  dislikes?: string[] | null
  preferred_contact_method?: 'phone' | 'email' | 'text' | 'instagram' | null
  preferred_event_days?: string[] | null
  preferred_service_style?: string | null
  budget_range_min_cents?: number | null
  budget_range_max_cents?: number | null
  recurring_pricing_model?: 'none' | 'flat_rate' | 'per_person' | null
  recurring_price_cents?: number | null
  recurring_pricing_notes?: string | null
  cleanup_expectations?: string | null
  leftovers_preference?: string | null
}

function parseList(input: string): string[] {
  return input
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export function ClientPreferences({
  clientId,
  initialValues,
}: {
  clientId: string
  initialValues: ClientPreferencesValues
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [dietaryRestrictions, setDietaryRestrictions] = useState(
    (initialValues.dietary_restrictions || []).join(', ')
  )
  const [allergies, setAllergies] = useState<string[]>(initialValues.allergies || [])
  const [dislikes, setDislikes] = useState((initialValues.dislikes || []).join(', '))
  const [preferredContactMethod, setPreferredContactMethod] = useState(
    initialValues.preferred_contact_method || ''
  )
  const [preferredEventDays, setPreferredEventDays] = useState(
    (initialValues.preferred_event_days || []).join(', ')
  )
  const [preferredServiceStyle, setPreferredServiceStyle] = useState(
    initialValues.preferred_service_style || ''
  )
  const [budgetMin, setBudgetMin] = useState(
    initialValues.budget_range_min_cents ? String(initialValues.budget_range_min_cents / 100) : ''
  )
  const [budgetMax, setBudgetMax] = useState(
    initialValues.budget_range_max_cents ? String(initialValues.budget_range_max_cents / 100) : ''
  )
  const [recurringPricingModel, setRecurringPricingModel] = useState(
    initialValues.recurring_pricing_model || 'none'
  )
  const [recurringPrice, setRecurringPrice] = useState(
    initialValues.recurring_price_cents ? String(initialValues.recurring_price_cents / 100) : ''
  )
  const [recurringPricingNotes, setRecurringPricingNotes] = useState(
    initialValues.recurring_pricing_notes || ''
  )
  const [cleanupExpectations, setCleanupExpectations] = useState(
    initialValues.cleanup_expectations || ''
  )
  const [leftoversPreference, setLeftoversPreference] = useState(
    initialValues.leftovers_preference || ''
  )

  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const saveDisabled = useMemo(() => isPending, [isPending])

  function handleSave() {
    setStatusMessage(null)
    setErrorMessage(null)

    startTransition(async () => {
      try {
        const payload = {
          clientId,
          dietary_restrictions: parseList(dietaryRestrictions),
          allergies,
          dislikes: parseList(dislikes),
          preferred_contact_method: preferredContactMethod || undefined,
          preferred_event_days: parseList(preferredEventDays),
          preferred_service_style: preferredServiceStyle || undefined,
          budget_range_min_cents: budgetMin ? Math.round(Number(budgetMin) * 100) : null,
          budget_range_max_cents: budgetMax ? Math.round(Number(budgetMax) * 100) : null,
          recurring_pricing_model: recurringPricingModel || null,
          recurring_price_cents:
            recurringPricingModel === 'none' ||
            !recurringPrice ||
            !Number.isFinite(Number(recurringPrice))
              ? null
              : Math.round(Number(recurringPrice) * 100),
          recurring_pricing_notes: recurringPricingNotes || null,
          cleanup_expectations: cleanupExpectations || undefined,
          leftovers_preference: leftoversPreference || undefined,
        }

        const response = await fetch('/api/clients/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || 'Failed to save preferences')
        }

        setStatusMessage('Preferences saved')
        router.refresh()
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to save preferences')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-stone-300">
            Dietary restrictions
            <Input
              className="mt-1"
              value={dietaryRestrictions}
              onChange={(event) => setDietaryRestrictions(event.target.value)}
              placeholder="Vegan, gluten-free"
            />
          </label>
          <div className="text-sm text-stone-300 md:col-span-2">
            <div className="mb-1">Allergies</div>
            <AllergyPicker value={allergies} onChange={setAllergies} compact />
          </div>
          <label className="text-sm text-stone-300">
            Dislikes
            <Input
              className="mt-1"
              value={dislikes}
              onChange={(event) => setDislikes(event.target.value)}
              placeholder="Mushrooms, cilantro"
            />
          </label>
          <label className="text-sm text-stone-300">
            Preferred contact method
            <select
              className="mt-1 h-10 w-full rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100"
              value={preferredContactMethod}
              onChange={(event) => setPreferredContactMethod(event.target.value)}
            >
              <option value="">Not set</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="text">Text</option>
              <option value="instagram">Instagram</option>
            </select>
          </label>
          <label className="text-sm text-stone-300">
            Preferred event days
            <Input
              className="mt-1"
              value={preferredEventDays}
              onChange={(event) => setPreferredEventDays(event.target.value)}
              placeholder="Friday, Saturday"
            />
          </label>
          <label className="text-sm text-stone-300">
            Preferred service style
            <Input
              className="mt-1"
              value={preferredServiceStyle}
              onChange={(event) => setPreferredServiceStyle(event.target.value)}
              placeholder="Plated tasting menu"
            />
          </label>
          <label className="text-sm text-stone-300">
            Budget minimum (USD)
            <Input
              className="mt-1"
              type="number"
              min={0}
              step="0.01"
              value={budgetMin}
              onChange={(event) => setBudgetMin(event.target.value)}
              placeholder="0.00"
            />
          </label>
          <label className="text-sm text-stone-300">
            Budget maximum (USD)
            <Input
              className="mt-1"
              type="number"
              min={0}
              step="0.01"
              value={budgetMax}
              onChange={(event) => setBudgetMax(event.target.value)}
              placeholder="0.00"
            />
          </label>
          <label className="text-sm text-stone-300">
            Recurring pricing model
            <select
              className="mt-1 h-10 w-full rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100"
              value={recurringPricingModel}
              onChange={(event) =>
                setRecurringPricingModel(event.target.value as 'none' | 'flat_rate' | 'per_person')
              }
            >
              <option value="none">No default</option>
              <option value="flat_rate">Flat rate (per service)</option>
              <option value="per_person">Per person</option>
            </select>
          </label>
          <label className="text-sm text-stone-300">
            Recurring default price (USD)
            <Input
              className="mt-1"
              type="number"
              min={0}
              step="0.01"
              value={recurringPrice}
              onChange={(event) => setRecurringPrice(event.target.value)}
              placeholder="0.00"
            />
          </label>
        </div>

        <label className="block text-sm text-stone-300">
          Recurring pricing notes
          <Textarea
            className="mt-1"
            value={recurringPricingNotes}
            onChange={(event) => setRecurringPricingNotes(event.target.value)}
            placeholder="Example: Weekly family meal prep rate, groceries billed separately"
          />
        </label>

        <label className="block text-sm text-stone-300">
          Cleanup expectations
          <Textarea
            className="mt-1"
            value={cleanupExpectations}
            onChange={(event) => setCleanupExpectations(event.target.value)}
            placeholder="Example: Leave kitchen reset and trash bagged"
          />
        </label>

        <label className="block text-sm text-stone-300">
          Leftovers preference
          <Textarea
            className="mt-1"
            value={leftoversPreference}
            onChange={(event) => setLeftoversPreference(event.target.value)}
            placeholder="Example: Portion leftovers for next-day lunch"
          />
        </label>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saveDisabled}>
            {isPending ? 'Saving...' : 'Save preferences'}
          </Button>
          {statusMessage && <p className="text-sm text-emerald-400">{statusMessage}</p>}
          {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
