'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  createPackage,
  updatePackage,
  type ExperiencePackageRow,
  type CreatePackageInput,
} from '@/lib/packages/package-actions'
import type { AddOn, SeasonalPricing } from '@/lib/packages/pricing-calculator'

type PackageFormProps = {
  existingPackage?: ExperiencePackageRow
  menus?: { id: string; name: string }[]
  onSuccess?: () => void
}

const PACKAGE_TYPES = [
  { value: '', label: 'Select package type' },
  { value: 'dinner_party', label: 'Dinner Party' },
  { value: 'meal_prep', label: 'Meal Prep' },
  { value: 'cooking_class', label: 'Cooking Class' },
  { value: 'tasting_menu', label: 'Tasting Menu' },
  { value: 'custom', label: 'Custom' },
]

const DEFAULT_SEASONAL: SeasonalPricing = {
  summer: 1.1,
  holiday: 1.25,
  off_peak: 0.9,
}

export function PackageForm({ existingPackage, menus, onSuccess }: PackageFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(existingPackage?.name ?? '')
  const [description, setDescription] = useState(existingPackage?.description ?? '')
  const [packageType, setPackageType] = useState(existingPackage?.package_type ?? '')
  const [basePriceDollars, setBasePriceDollars] = useState(
    existingPackage ? (existingPackage.base_price_cents / 100).toFixed(2) : ''
  )
  const [includes, setIncludes] = useState<string[]>(existingPackage?.includes ?? [])
  const [addOns, setAddOns] = useState<AddOn[]>(existingPackage?.add_ons ?? [])
  const [minGuests, setMinGuests] = useState(existingPackage?.min_guests ?? 1)
  const [maxGuests, setMaxGuests] = useState(existingPackage?.max_guests ?? 12)
  const [durationHours, setDurationHours] = useState(
    existingPackage?.duration_hours?.toString() ?? ''
  )
  const [cuisineTypes, setCuisineTypes] = useState<string[]>(existingPackage?.cuisine_types ?? [])
  const [menuId, setMenuId] = useState(existingPackage?.menu_id ?? '')
  const [useSeasonalPricing, setUseSeasonalPricing] = useState(!!existingPackage?.seasonal_pricing)
  const [seasonalPricing, setSeasonalPricing] = useState<SeasonalPricing>(
    existingPackage?.seasonal_pricing ?? DEFAULT_SEASONAL
  )

  // Tag input state
  const [newIncludeItem, setNewIncludeItem] = useState('')
  const [newCuisine, setNewCuisine] = useState('')

  // Add-on builder state
  const [newAddOnName, setNewAddOnName] = useState('')
  const [newAddOnPriceDollars, setNewAddOnPriceDollars] = useState('')
  const [newAddOnPerPerson, setNewAddOnPerPerson] = useState(true)

  const isEditing = !!existingPackage

  function addInclude() {
    const item = newIncludeItem.trim()
    if (item && !includes.includes(item)) {
      setIncludes([...includes, item])
      setNewIncludeItem('')
    }
  }

  function removeInclude(idx: number) {
    setIncludes(includes.filter((_, i) => i !== idx))
  }

  function addCuisine() {
    const item = newCuisine.trim()
    if (item && !cuisineTypes.includes(item)) {
      setCuisineTypes([...cuisineTypes, item])
      setNewCuisine('')
    }
  }

  function removeCuisine(idx: number) {
    setCuisineTypes(cuisineTypes.filter((_, i) => i !== idx))
  }

  function addAddOn() {
    const addOnName = newAddOnName.trim()
    const priceCents = Math.round(parseFloat(newAddOnPriceDollars || '0') * 100)
    if (!addOnName || priceCents <= 0) return

    setAddOns([
      ...addOns,
      { name: addOnName, price_cents: priceCents, per_person: newAddOnPerPerson },
    ])
    setNewAddOnName('')
    setNewAddOnPriceDollars('')
    setNewAddOnPerPerson(true)
  }

  function removeAddOn(idx: number) {
    setAddOns(addOns.filter((_, i) => i !== idx))
  }

  function updateSeasonalRate(key: string, value: string) {
    const num = parseFloat(value)
    if (!isNaN(num) && num > 0) {
      setSeasonalPricing({ ...seasonalPricing, [key]: num })
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const basePriceCents = Math.round(parseFloat(basePriceDollars || '0') * 100)
    if (!name.trim()) {
      setError('Package name is required')
      return
    }
    if (!packageType) {
      setError('Package type is required')
      return
    }
    if (basePriceCents <= 0) {
      setError('Base price must be greater than zero')
      return
    }

    const input: CreatePackageInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      package_type: packageType,
      base_price_cents: basePriceCents,
      includes,
      add_ons: addOns,
      min_guests: minGuests,
      max_guests: maxGuests || undefined,
      duration_hours: durationHours ? parseFloat(durationHours) : undefined,
      cuisine_types: cuisineTypes.length > 0 ? cuisineTypes : undefined,
      menu_id: menuId || undefined,
      seasonal_pricing: useSeasonalPricing ? seasonalPricing : undefined,
    }

    startTransition(async () => {
      try {
        if (isEditing) {
          await updatePackage(existingPackage.id, input)
        } else {
          await createPackage(input)
        }
        router.refresh()
        onSuccess?.()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to save package')
      }
    })
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="text-lg font-semibold">{isEditing ? 'Edit Package' : 'Create Package'}</h2>

        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Package Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Intimate Dinner Party"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this package includes and what makes it special"
            rows={3}
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium mb-1">Package Type</label>
          <Select
            value={packageType}
            onChange={(e) => setPackageType(e.target.value)}
            options={PACKAGE_TYPES}
          />
        </div>

        {/* Base Price */}
        <div>
          <label className="block text-sm font-medium mb-1">Base Price (per person)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={basePriceDollars}
            onChange={(e) => setBasePriceDollars(e.target.value)}
            placeholder="75.00"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Per-person price before guest tier discounts and seasonal adjustments
          </p>
        </div>

        {/* Guest Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Min Guests</label>
            <Input
              type="number"
              min="1"
              value={minGuests}
              onChange={(e) => setMinGuests(parseInt(e.target.value) || 1)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Guests</label>
            <Input
              type="number"
              min="1"
              value={maxGuests}
              onChange={(e) => setMaxGuests(parseInt(e.target.value) || 1)}
            />
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium mb-1">Duration (hours)</label>
          <Input
            type="number"
            step="0.5"
            min="0.5"
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
            placeholder="3.0"
          />
        </div>

        {/* Menu Assignment */}
        {menus && menus.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">Linked Menu (optional)</label>
            <Select
              value={menuId}
              onChange={(e) => setMenuId(e.target.value)}
              options={[
                { value: '', label: 'No menu linked' },
                ...menus.map((m) => ({ value: m.id, label: m.name })),
              ]}
            />
          </div>
        )}

        {/* Includes (tag list) */}
        <div>
          <label className="block text-sm font-medium mb-1">What's Included</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {includes.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeInclude(idx)}
                  className="text-blue-600 hover:text-blue-900 font-bold"
                >
                  x
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newIncludeItem}
              onChange={(e) => setNewIncludeItem(e.target.value)}
              placeholder="e.g. 4-course meal"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addInclude()
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={addInclude}>
              Add
            </Button>
          </div>
        </div>

        {/* Cuisine Types (tag list) */}
        <div>
          <label className="block text-sm font-medium mb-1">Cuisine Types</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {cuisineTypes.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm text-green-800"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeCuisine(idx)}
                  className="text-green-600 hover:text-green-900 font-bold"
                >
                  x
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newCuisine}
              onChange={(e) => setNewCuisine(e.target.value)}
              placeholder="e.g. French, Italian"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCuisine()
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={addCuisine}>
              Add
            </Button>
          </div>
        </div>

        {/* Add-ons Builder */}
        <div>
          <label className="block text-sm font-medium mb-1">Add-ons</label>
          {addOns.length > 0 && (
            <div className="space-y-2 mb-3">
              {addOns.map((addon, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded border p-2 text-sm"
                >
                  <div>
                    <span className="font-medium">{addon.name}</span>
                    <span className="ml-2 text-gray-500">
                      ${(addon.price_cents / 100).toFixed(2)}
                      {addon.per_person ? '/person' : ' flat'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAddOn(idx)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
            <div>
              <Input
                value={newAddOnName}
                onChange={(e) => setNewAddOnName(e.target.value)}
                placeholder="Add-on name"
              />
            </div>
            <div>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newAddOnPriceDollars}
                onChange={(e) => setNewAddOnPriceDollars(e.target.value)}
                placeholder="Price"
                className="w-24"
              />
            </div>
            <label className="flex items-center gap-1 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={newAddOnPerPerson}
                onChange={(e) => setNewAddOnPerPerson(e.target.checked)}
              />
              Per person
            </label>
            <Button type="button" variant="secondary" onClick={addAddOn}>
              Add
            </Button>
          </div>
        </div>

        {/* Seasonal Pricing */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <input
              type="checkbox"
              checked={useSeasonalPricing}
              onChange={(e) => setUseSeasonalPricing(e.target.checked)}
            />
            Enable Seasonal Pricing
          </label>
          {useSeasonalPricing && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(seasonalPricing).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1 capitalize">
                    {key.replace('_', ' ')}
                  </label>
                  <Input
                    type="number"
                    step="0.05"
                    min="0.1"
                    value={value}
                    onChange={(e) => updateSeasonalRate(key, e.target.value)}
                    className="text-sm"
                  />
                  <span className="text-xs text-gray-400">
                    {value > 1
                      ? `+${Math.round((value - 1) * 100)}%`
                      : `${Math.round((1 - value) * 100)}% off`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? 'Saving...' : isEditing ? 'Update Package' : 'Create Package'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}
