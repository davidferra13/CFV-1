'use client'

import { useState, useTransition } from 'react'
import {
  createMealPrepItem,
  updateMealPrepItem,
  type MealPrepItem,
} from '@/lib/store/meal-prep-actions'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const CATEGORY_OPTIONS = [
  { value: 'entree', label: 'Entree' },
  { value: 'side', label: 'Side' },
  { value: 'soup', label: 'Soup' },
  { value: 'salad', label: 'Salad' },
  { value: 'snack', label: 'Snack' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'beverage', label: 'Beverage' },
  { value: 'bundle', label: 'Bundle' },
]

const DIETARY_TAG_OPTIONS = [
  'Vegan',
  'Vegetarian',
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
  'Keto',
  'Paleo',
  'Low-Carb',
  'High-Protein',
  'Whole30',
]

interface MealPrepItemFormProps {
  item?: MealPrepItem
  onSaved: () => void
  onCancel: () => void
}

export function MealPrepItemForm({ item, onSaved, onCancel }: MealPrepItemFormProps) {
  const isEditing = !!item

  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [priceDollars, setPriceDollars] = useState(
    item ? (item.price_cents / 100).toFixed(2) : ''
  )
  const [category, setCategory] = useState(item?.category ?? 'entree')
  const [dietaryTags, setDietaryTags] = useState<string[]>(item?.dietary_tags ?? [])
  const [ingredientsSummary, setIngredientsSummary] = useState(item?.ingredients_summary ?? '')
  const [calories, setCalories] = useState(item?.calories?.toString() ?? '')
  const [servingSize, setServingSize] = useState(item?.serving_size ?? '')
  const [photoUrl, setPhotoUrl] = useState(item?.photo_url ?? '')
  const [maxQuantity, setMaxQuantity] = useState(item?.max_quantity?.toString() ?? '')
  const [prepLeadDays, setPrepLeadDays] = useState(item?.prep_lead_days?.toString() ?? '2')

  const [isPending, startTransition] = useTransition()

  const toggleTag = (tag: string) => {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Name is required')
      return
    }

    const priceFloat = parseFloat(priceDollars)
    if (isNaN(priceFloat) || priceFloat < 0) {
      toast.error('Enter a valid price')
      return
    }

    const priceCents = Math.round(priceFloat * 100)

    startTransition(async () => {
      try {
        const input = {
          name: name.trim(),
          description: description.trim() || undefined,
          price_cents: priceCents,
          category,
          dietary_tags: dietaryTags,
          ingredients_summary: ingredientsSummary.trim() || undefined,
          calories: calories ? parseInt(calories, 10) : undefined,
          serving_size: servingSize.trim() || undefined,
          photo_url: photoUrl.trim() || undefined,
          max_quantity: maxQuantity ? parseInt(maxQuantity, 10) : undefined,
          prep_lead_days: parseInt(prepLeadDays, 10) || 2,
        }

        if (isEditing && item) {
          await updateMealPrepItem(item.id, input)
          toast.success('Item updated')
        } else {
          await createMealPrepItem(input)
          toast.success('Item created')
        }
        onSaved()
      } catch (err) {
        toast.error(isEditing ? 'Failed to update item' : 'Failed to create item')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{isEditing ? 'Edit Item' : 'New Menu Item'}</h2>
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {/* Name */}
      <div>
        <label className="mb-1 block text-sm font-medium">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Grilled Chicken Bowl"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
          rows={3}
          placeholder="A hearty bowl with grilled chicken, quinoa, and roasted vegetables."
        />
      </div>

      {/* Price + Category row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Price ($) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={priceDollars}
            onChange={(e) => setPriceDollars(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="12.99"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Category *</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dietary tags */}
      <div>
        <label className="mb-1 block text-sm font-medium">Dietary Tags</label>
        <div className="flex flex-wrap gap-2">
          {DIETARY_TAG_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                dietaryTags.includes(tag)
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Ingredients summary */}
      <div>
        <label className="mb-1 block text-sm font-medium">Ingredients Summary</label>
        <input
          type="text"
          value={ingredientsSummary}
          onChange={(e) => setIngredientsSummary(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Chicken, quinoa, bell peppers, olive oil..."
        />
      </div>

      {/* Calories + Serving size row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Calories</label>
          <input
            type="number"
            min="0"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="450"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Serving Size</label>
          <input
            type="text"
            value={servingSize}
            onChange={(e) => setServingSize(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="16 oz"
          />
        </div>
      </div>

      {/* Photo URL */}
      <div>
        <label className="mb-1 block text-sm font-medium">Photo URL</label>
        <input
          type="url"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="https://..."
        />
      </div>

      {/* Max quantity + Prep lead days */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Max Quantity per Order</label>
          <input
            type="number"
            min="1"
            value={maxQuantity}
            onChange={(e) => setMaxQuantity(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Unlimited"
          />
          <p className="mt-0.5 text-xs text-gray-400">Leave blank for unlimited</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Prep Lead Days</label>
          <input
            type="number"
            min="0"
            value={prepLeadDays}
            onChange={(e) => setPrepLeadDays(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="2"
          />
          <p className="mt-0.5 text-xs text-gray-400">Days of advance notice needed</p>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : isEditing ? 'Update Item' : 'Create Item'}
        </Button>
      </div>
    </form>
  )
}
