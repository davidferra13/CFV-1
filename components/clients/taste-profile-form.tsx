// Client Taste Profile Form
// Chef-entered only. Tracks cuisines, proteins, textures, spice tolerance,
// ingredient dislikes, avoids, and notes.

'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { TagArrayInput } from '@/components/ui/tag-array-input'
import { toast } from 'sonner'
import {
  upsertTasteProfile,
  type ClientTasteProfile,
  type TasteProfileInput,
} from '@/lib/clients/taste-profile-actions'

type TasteProfileFormProps = {
  clientId: string
  initial: ClientTasteProfile | null
}

const CUISINE_SUGGESTIONS = [
  'Italian', 'French', 'Japanese', 'Mexican', 'Thai', 'Indian',
  'Mediterranean', 'Chinese', 'Korean', 'Vietnamese', 'Greek',
  'Spanish', 'Middle Eastern', 'American', 'Brazilian',
]

const PROTEIN_SUGGESTIONS = [
  'Chicken', 'Beef', 'Pork', 'Lamb', 'Fish', 'Shrimp', 'Scallops',
  'Lobster', 'Crab', 'Duck', 'Venison', 'Tofu', 'Tempeh', 'Turkey',
]

const TEXTURE_SUGGESTIONS = [
  'Crispy', 'Creamy', 'Crunchy', 'Tender', 'Silky', 'Al dente',
  'Flaky', 'Chewy', 'Smooth', 'Light', 'Rich', 'Fluffy',
]

const SPICE_LABELS: Record<number, string> = {
  1: 'No spice',
  2: 'Mild',
  3: 'Medium',
  4: 'Spicy',
  5: 'Extra hot',
}

function emptyForm(): TasteProfileInput {
  return {
    favoriteCuisines: [],
    dislikedIngredients: [],
    spiceTolerance: 3,
    texturePreferences: [],
    flavorNotes: null,
    preferredProteins: [],
    avoids: [],
    specialOccasionsNotes: null,
  }
}

function profileToForm(p: ClientTasteProfile): TasteProfileInput {
  return {
    favoriteCuisines: p.favoriteCuisines,
    dislikedIngredients: p.dislikedIngredients,
    spiceTolerance: p.spiceTolerance,
    texturePreferences: p.texturePreferences,
    flavorNotes: p.flavorNotes,
    preferredProteins: p.preferredProteins,
    avoids: p.avoids,
    specialOccasionsNotes: p.specialOccasionsNotes,
  }
}

export function TasteProfileForm({ clientId, initial }: TasteProfileFormProps) {
  const [form, setForm] = useState<TasteProfileInput>(
    initial ? profileToForm(initial) : emptyForm()
  )
  const [isPending, startTransition] = useTransition()

  function update<K extends keyof TasteProfileInput>(key: K, value: TasteProfileInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    const previous = { ...form }
    startTransition(async () => {
      try {
        await upsertTasteProfile(clientId, form)
        toast.success('Taste profile saved')
      } catch (err) {
        setForm(previous)
        toast.error('Failed to save taste profile')
        console.error('[taste-profile-form]', err)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Favorite Cuisines */}
      <TagArrayInput
        label="Favorite Cuisines"
        value={form.favoriteCuisines}
        onChange={(v) => update('favoriteCuisines', v)}
        placeholder="Add a cuisine..."
        suggestions={CUISINE_SUGGESTIONS}
      />

      {/* Preferred Proteins */}
      <TagArrayInput
        label="Preferred Proteins"
        value={form.preferredProteins}
        onChange={(v) => update('preferredProteins', v)}
        placeholder="Add a protein..."
        suggestions={PROTEIN_SUGGESTIONS}
      />

      {/* Texture Preferences */}
      <TagArrayInput
        label="Texture Preferences"
        value={form.texturePreferences}
        onChange={(v) => update('texturePreferences', v)}
        placeholder="Add a texture..."
        suggestions={TEXTURE_SUGGESTIONS}
      />

      {/* Disliked Ingredients */}
      <TagArrayInput
        label="Disliked Ingredients"
        value={form.dislikedIngredients}
        onChange={(v) => update('dislikedIngredients', v)}
        placeholder="Add an ingredient..."
      />

      {/* Avoids */}
      <TagArrayInput
        label="Avoids (non-allergy)"
        value={form.avoids}
        onChange={(v) => update('avoids', v)}
        placeholder="Add item to avoid..."
      />

      {/* Spice Tolerance */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Spice Tolerance
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => update('spiceTolerance', level)}
              className={`flex-1 py-2 px-1 rounded-lg text-sm font-medium transition-colors ${
                form.spiceTolerance === level
                  ? 'bg-brand-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              <div>{level}</div>
              <div className="text-xs mt-0.5 opacity-80">{SPICE_LABELS[level]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Flavor Notes */}
      <div>
        <label
          htmlFor="flavor-notes"
          className="block text-sm font-medium text-zinc-300 mb-1"
        >
          Flavor Notes
        </label>
        <Textarea
          id="flavor-notes"
          value={form.flavorNotes ?? ''}
          onChange={(e) => update('flavorNotes', e.target.value || null)}
          placeholder="General flavor preferences, cooking style notes..."
          rows={3}
        />
      </div>

      {/* Special Occasions Notes */}
      <div>
        <label
          htmlFor="occasions-notes"
          className="block text-sm font-medium text-zinc-300 mb-1"
        >
          Special Occasions Notes
        </label>
        <Textarea
          id="occasions-notes"
          value={form.specialOccasionsNotes ?? ''}
          onChange={(e) => update('specialOccasionsNotes', e.target.value || null)}
          placeholder="Birthday cake preferences, holiday traditions, anniversary dishes..."
          rows={3}
        />
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button variant="primary" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Taste Profile'}
        </Button>
      </div>
    </div>
  )
}
