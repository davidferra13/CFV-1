'use client'

import { useState } from 'react'
import { updateClient } from '@/lib/clients/actions'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

const DAY_OPTIONS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

type Props = {
  clientId: string
  preferredServiceStyle: string | null
  typicalGuestCount: string | null
  preferredEventDays: string[] | null
  budgetRangeMinCents: number | null
  budgetRangeMaxCents: number | null
  recurringPricingModel: 'none' | 'flat_rate' | 'per_person' | null
  recurringPriceCents: number | null
  recurringPricingNotes: string | null
  cleanupExpectations: string | null
  leftoversPref: string | null
}

function formatCents(cents: number | null) {
  if (cents === null || cents === undefined) return '-'
  return `$${(cents / 100).toLocaleString()}`
}

export function ServiceDefaultsPanel({ clientId, ...initial }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serviceStyle, setServiceStyle] = useState(initial.preferredServiceStyle || '')
  const [guestCount, setGuestCount] = useState(initial.typicalGuestCount || '')
  const [days, setDays] = useState<string[]>(initial.preferredEventDays || [])
  const [budgetMin, setBudgetMin] = useState(
    initial.budgetRangeMinCents ? String(initial.budgetRangeMinCents / 100) : ''
  )
  const [budgetMax, setBudgetMax] = useState(
    initial.budgetRangeMaxCents ? String(initial.budgetRangeMaxCents / 100) : ''
  )
  const [recurringPricingModel, setRecurringPricingModel] = useState(
    initial.recurringPricingModel || 'none'
  )
  const [recurringPrice, setRecurringPrice] = useState(
    initial.recurringPriceCents ? String(initial.recurringPriceCents / 100) : ''
  )
  const [recurringPricingNotes, setRecurringPricingNotes] = useState(
    initial.recurringPricingNotes || ''
  )
  const [cleanup, setCleanup] = useState(initial.cleanupExpectations || '')
  const [leftovers, setLeftovers] = useState(initial.leftoversPref || '')

  async function handleSave() {
    setSaving(true)
    try {
      await updateClient(clientId, {
        preferred_service_style: serviceStyle || undefined,
        typical_guest_count: guestCount || undefined,
        preferred_event_days: days.length > 0 ? days : undefined,
        budget_range_min_cents: budgetMin ? Math.round(parseFloat(budgetMin) * 100) : null,
        budget_range_max_cents: budgetMax ? Math.round(parseFloat(budgetMax) * 100) : null,
        recurring_pricing_model: recurringPricingModel || null,
        recurring_price_cents:
          recurringPricingModel === 'none' ||
          !recurringPrice ||
          !Number.isFinite(parseFloat(recurringPrice))
            ? null
            : Math.round(parseFloat(recurringPrice) * 100),
        recurring_pricing_notes: recurringPricingNotes || null,
        cleanup_expectations: cleanup || undefined,
        leftovers_preference: leftovers || undefined,
      })
      setEditing(false)
    } catch (err) {
      console.error('Failed to update service defaults:', err)
    } finally {
      setSaving(false)
    }
  }

  const hasData =
    serviceStyle ||
    guestCount ||
    days.length > 0 ||
    budgetMin ||
    budgetMax ||
    (recurringPricingModel && recurringPricingModel !== 'none') ||
    recurringPrice ||
    recurringPricingNotes ||
    cleanup ||
    leftovers

  if (!editing) {
    return (
      <div className="rounded-lg border border-stone-700 overflow-hidden">
        <div className="px-4 py-3 bg-stone-800 border-b border-stone-700 flex items-center justify-between">
          <h3 className="font-medium text-stone-200">Service Defaults</h3>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm text-brand-500 hover:text-brand-600"
          >
            Edit
          </button>
        </div>
        {hasData ? (
          <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {serviceStyle && (
              <>
                <span className="text-stone-500">Service Style</span>
                <span className="text-stone-200 capitalize">{serviceStyle.replace(/-/g, ' ')}</span>
              </>
            )}
            {guestCount && (
              <>
                <span className="text-stone-500">Typical Guest Count</span>
                <span className="text-stone-200">{guestCount}</span>
              </>
            )}
            {days.length > 0 && (
              <>
                <span className="text-stone-500">Preferred Days</span>
                <span className="text-stone-200 capitalize">{days.join(', ')}</span>
              </>
            )}
            {(budgetMin || budgetMax) && (
              <>
                <span className="text-stone-500">Budget Range</span>
                <span className="text-stone-200">
                  {formatCents(initial.budgetRangeMinCents)} –{' '}
                  {formatCents(initial.budgetRangeMaxCents)}
                </span>
              </>
            )}
            {(recurringPricingModel !== 'none' || recurringPrice) && (
              <>
                <span className="text-stone-500">Recurring Default</span>
                <span className="text-stone-200">
                  {recurringPrice
                    ? `${formatCents(Math.round(parseFloat(recurringPrice) * 100))} ${
                        recurringPricingModel === 'per_person' ? 'per person' : 'flat rate'
                      }`
                    : recurringPricingModel === 'per_person'
                      ? 'Per person'
                      : 'Flat rate'}
                </span>
              </>
            )}
            {recurringPricingNotes && (
              <>
                <span className="text-stone-500">Recurring Notes</span>
                <span className="text-stone-200">{recurringPricingNotes}</span>
              </>
            )}
            {cleanup && (
              <>
                <span className="text-stone-500">Cleanup</span>
                <span className="text-stone-200 capitalize">{cleanup.replace(/_/g, ' ')}</span>
              </>
            )}
            {leftovers && (
              <>
                <span className="text-stone-500">Leftovers</span>
                <span className="text-stone-200 capitalize">{leftovers.replace(/_/g, ' ')}</span>
              </>
            )}
          </div>
        ) : (
          <div className="px-4 py-4 text-center text-stone-400 text-sm">
            No service defaults recorded
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-brand-700 overflow-hidden">
      <div className="px-4 py-3 bg-brand-950 border-b border-brand-700">
        <h3 className="font-medium text-stone-200">Service Defaults</h3>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Preferred Service Style"
            value={serviceStyle}
            onChange={(e) => setServiceStyle(e.target.value)}
          >
            <option value="">Select...</option>
            <option value="plated">Plated (formal)</option>
            <option value="family-style">Family Style</option>
            <option value="buffet">Buffet</option>
            <option value="tasting">Tasting Menu</option>
            <option value="meal-prep">Meal Prep</option>
            <option value="cooking-class">Cooking Class</option>
            <option value="cocktail-party">Cocktail / Passed Apps</option>
            <option value="bbq">BBQ / Outdoor Grill</option>
          </Select>
          <Input
            label="Typical Guest Count"
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
            placeholder="e.g. 4-6"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1.5">
            Preferred Event Days
          </label>
          <div className="flex flex-wrap gap-2">
            {DAY_OPTIONS.map((day) => (
              <label key={day} className="flex items-center gap-1.5 text-sm capitalize">
                <input
                  type="checkbox"
                  checked={days.includes(day)}
                  onChange={(e) =>
                    setDays(e.target.checked ? [...days, day] : days.filter((d) => d !== day))
                  }
                  className="text-brand-500 rounded"
                />
                {day}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Budget Min ($)"
            type="number"
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value)}
            placeholder="500"
          />
          <Input
            label="Budget Max ($)"
            type="number"
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
            placeholder="2000"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Recurring Pricing Model"
            value={recurringPricingModel}
            onChange={(e) => setRecurringPricingModel(e.target.value as any)}
          >
            <option value="none">No default</option>
            <option value="flat_rate">Flat rate (per service)</option>
            <option value="per_person">Per person</option>
          </Select>
          <Input
            label="Recurring Default Price ($)"
            type="number"
            value={recurringPrice}
            onChange={(e) => setRecurringPrice(e.target.value)}
            placeholder="350"
          />
        </div>
        <Input
          label="Recurring Pricing Notes"
          value={recurringPricingNotes}
          onChange={(e) => setRecurringPricingNotes(e.target.value)}
          placeholder="Groceries billed separately, weekly Tuesday delivery"
        />
        <Select
          label="Cleanup Expectations"
          value={cleanup}
          onChange={(e) => setCleanup(e.target.value)}
        >
          <option value="">Select...</option>
          <option value="full_reset">Full Kitchen Reset</option>
          <option value="cooking_mess">Cooking Mess Only</option>
          <option value="minimal">Minimal - they clean up</option>
          <option value="staff_handles">Their Staff Handles It</option>
        </Select>
        <Select
          label="Leftovers Preference"
          value={leftovers}
          onChange={(e) => setLeftovers(e.target.value)}
        >
          <option value="">Select...</option>
          <option value="package_all">Package Everything</option>
          <option value="portion_control">Portion Control</option>
          <option value="staff_takes">Staff Takes Leftovers</option>
          <option value="compost">Compost / Discard</option>
          <option value="no_preference">No Preference</option>
        </Select>
        <div className="flex gap-2">
          <Button onClick={handleSave} loading={saving}>
            Save
          </Button>
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
