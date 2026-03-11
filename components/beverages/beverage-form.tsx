'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createBeverage, updateBeverage } from '@/lib/beverages/actions'
import type { Beverage, BeverageType, CreateBeverageInput } from '@/lib/beverages/actions'

const BEVERAGE_TYPES: { value: BeverageType; label: string }[] = [
  { value: 'wine', label: 'Wine' },
  { value: 'cocktail', label: 'Cocktail' },
  { value: 'mocktail', label: 'Mocktail' },
  { value: 'beer', label: 'Beer' },
  { value: 'spirit', label: 'Spirit' },
  { value: 'non-alcoholic', label: 'Non-Alcoholic' },
]

const WINE_SUBTYPES = [
  { value: 'red', label: 'Red' },
  { value: 'white', label: 'White' },
  { value: 'rosé', label: 'Rose' },
  { value: 'sparkling', label: 'Sparkling' },
  { value: 'dessert', label: 'Dessert' },
]

const COCKTAIL_SUBTYPES = [
  { value: 'classic', label: 'Classic' },
  { value: 'tiki', label: 'Tiki' },
  { value: 'modern', label: 'Modern' },
]

const COMMON_TAGS = ['bold', 'light', 'fruity', 'dry', 'sweet', 'herbaceous', 'smoky', 'spicy', 'citrus', 'floral']

type Props = {
  beverage?: Beverage
  onComplete?: () => void
  onCancel?: () => void
}

export function BeverageForm({ beverage, onComplete, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(beverage?.name ?? '')
  const [type, setType] = useState<BeverageType>(beverage?.type ?? 'wine')
  const [subtype, setSubtype] = useState(beverage?.subtype ?? '')
  const [description, setDescription] = useState(beverage?.description ?? '')
  const [costDollars, setCostDollars] = useState(
    beverage?.cost_cents != null ? (beverage.cost_cents / 100).toFixed(2) : ''
  )
  const [markupPercent, setMarkupPercent] = useState(
    beverage?.markup_percent != null ? String(beverage.markup_percent) : '200'
  )
  const [sellDollars, setSellDollars] = useState(
    beverage?.sell_price_cents != null ? (beverage.sell_price_cents / 100).toFixed(2) : ''
  )
  const [servingSize, setServingSize] = useState(beverage?.serving_size ?? '')
  const [servingsPerUnit, setServingsPerUnit] = useState(
    beverage?.servings_per_unit != null ? String(beverage.servings_per_unit) : ''
  )
  const [pairingNotes, setPairingNotes] = useState(beverage?.pairing_notes ?? '')
  const [recipe, setRecipe] = useState(beverage?.recipe ?? '')
  const [selectedTags, setSelectedTags] = useState<string[]>(beverage?.tags ?? [])
  const [region, setRegion] = useState(beverage?.region ?? '')
  const [vintage, setVintage] = useState(beverage?.vintage ?? '')

  // Auto-calculate sell price when cost or markup changes
  const computedSellDollars = (() => {
    const cost = parseFloat(costDollars)
    const markup = parseInt(markupPercent)
    if (!isNaN(cost) && !isNaN(markup) && cost > 0) {
      return ((cost * markup) / 100).toFixed(2)
    }
    return ''
  })()

  const showWineFields = type === 'wine'
  const showRecipeField = type === 'cocktail' || type === 'mocktail'
  const subtypeOptions = type === 'wine' ? WINE_SUBTYPES : type === 'cocktail' ? COCKTAIL_SUBTYPES : []

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const costCents = costDollars ? Math.round(parseFloat(costDollars) * 100) : null
    const sellCents = sellDollars
      ? Math.round(parseFloat(sellDollars) * 100)
      : computedSellDollars
        ? Math.round(parseFloat(computedSellDollars) * 100)
        : null

    const data: CreateBeverageInput = {
      name,
      type,
      subtype: subtype || null,
      description: description || null,
      cost_cents: costCents,
      markup_percent: markupPercent ? parseInt(markupPercent) : null,
      sell_price_cents: sellCents,
      serving_size: servingSize || null,
      servings_per_unit: servingsPerUnit ? parseInt(servingsPerUnit) : null,
      pairing_notes: pairingNotes || null,
      recipe: recipe || null,
      tags: selectedTags,
      region: region || null,
      vintage: vintage || null,
      is_active: true,
    }

    startTransition(async () => {
      try {
        if (beverage) {
          await updateBeverage(beverage.id, data)
        } else {
          await createBeverage(data)
        }
        onComplete?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-200 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Name + Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="bev-name">Name *</Label>
          <Input
            id="bev-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="2022 Chateau Margaux"
            required
          />
        </div>
        <Select
          label="Type *"
          value={type}
          onChange={(e) => {
            setType(e.target.value as BeverageType)
            setSubtype('')
          }}
          options={BEVERAGE_TYPES}
          required
        />
      </div>

      {/* Subtype (conditional) */}
      {subtypeOptions.length > 0 && (
        <Select
          label="Subtype"
          value={subtype}
          onChange={(e) => setSubtype(e.target.value)}
          options={subtypeOptions}
        />
      )}

      {/* Description */}
      <div>
        <Label htmlFor="bev-desc">Description</Label>
        <Textarea
          id="bev-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A bold, full-bodied Bordeaux with notes of dark fruit and cedar"
          rows={2}
        />
      </div>

      {/* Pricing row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="bev-cost">Cost ($)</Label>
          <Input
            id="bev-cost"
            type="number"
            step="0.01"
            min="0"
            value={costDollars}
            onChange={(e) => setCostDollars(e.target.value)}
            placeholder="45.00"
          />
        </div>
        <div>
          <Label htmlFor="bev-markup">Markup %</Label>
          <Input
            id="bev-markup"
            type="number"
            min="0"
            value={markupPercent}
            onChange={(e) => setMarkupPercent(e.target.value)}
            placeholder="200"
          />
          <p className="text-xs text-stone-400 mt-1">200% = 2x cost</p>
        </div>
        <div>
          <Label htmlFor="bev-sell">Sell Price ($)</Label>
          <Input
            id="bev-sell"
            type="number"
            step="0.01"
            min="0"
            value={sellDollars || computedSellDollars}
            onChange={(e) => setSellDollars(e.target.value)}
            placeholder={computedSellDollars || 'Auto-calculated'}
          />
          {!sellDollars && computedSellDollars && (
            <p className="text-xs text-stone-400 mt-1">Auto-calculated from markup</p>
          )}
        </div>
      </div>

      {/* Serving info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="bev-serving">Serving Size</Label>
          <Input
            id="bev-serving"
            value={servingSize}
            onChange={(e) => setServingSize(e.target.value)}
            placeholder="5oz pour"
          />
        </div>
        <div>
          <Label htmlFor="bev-spu">Servings per Unit</Label>
          <Input
            id="bev-spu"
            type="number"
            min="1"
            value={servingsPerUnit}
            onChange={(e) => setServingsPerUnit(e.target.value)}
            placeholder="5"
          />
        </div>
      </div>

      {/* Wine fields */}
      {showWineFields && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bev-region">Region</Label>
            <Input
              id="bev-region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Bordeaux, France"
            />
          </div>
          <div>
            <Label htmlFor="bev-vintage">Vintage</Label>
            <Input
              id="bev-vintage"
              value={vintage}
              onChange={(e) => setVintage(e.target.value)}
              placeholder="2022"
            />
          </div>
        </div>
      )}

      {/* Recipe (cocktails/mocktails) */}
      {showRecipeField && (
        <div>
          <Label htmlFor="bev-recipe">Recipe / Method</Label>
          <Textarea
            id="bev-recipe"
            value={recipe}
            onChange={(e) => setRecipe(e.target.value)}
            placeholder="2oz bourbon, 1oz sweet vermouth, 2 dashes Angostura..."
            rows={4}
          />
        </div>
      )}

      {/* Pairing notes */}
      <div>
        <Label htmlFor="bev-pairing">General Pairing Notes</Label>
        <Textarea
          id="bev-pairing"
          value={pairingNotes}
          onChange={(e) => setPairingNotes(e.target.value)}
          placeholder="Pairs well with red meats, aged cheeses, and rich sauces"
          rows={2}
        />
      </div>

      {/* Tags */}
      <div>
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {COMMON_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-brand-600 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending || !name}>
          {isPending ? 'Saving...' : beverage ? 'Update Beverage' : 'Add Beverage'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
