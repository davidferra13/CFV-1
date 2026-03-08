// Plating Guide Editor
// Form to create/edit per-dish visual presentation instructions

'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createPlatingGuide, updatePlatingGuide } from '@/lib/recipes/plating-actions'
import type { PlatingGuide, PlatingComponent, CreatePlatingGuideInput, UpdatePlatingGuideInput } from '@/lib/recipes/plating-actions'

interface PlatingGuideEditorProps {
  guide?: PlatingGuide | null
  recipeId?: string | null
  recipeName?: string
  onSave?: (guide: PlatingGuide) => void
  onCancel?: () => void
}

const VESSEL_SUGGESTIONS = [
  '10-inch white rimmed plate',
  'Shallow bowl',
  'Deep bowl',
  'Slate board',
  'Wooden board',
  'Ramekin',
  'Martini glass',
  'Mason jar',
  'Cast iron skillet',
  'Sheet pan',
]

export function PlatingGuideEditor({ guide, recipeId, recipeName, onSave, onCancel }: PlatingGuideEditorProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [dishName, setDishName] = useState(guide?.dish_name || recipeName || '')
  const [vessel, setVessel] = useState(guide?.vessel || '')
  const [components, setComponents] = useState<PlatingComponent[]>(
    guide?.components && guide.components.length > 0
      ? guide.components
      : [{ name: '', placement: '', technique: '', notes: '' }]
  )
  const [garnish, setGarnish] = useState(guide?.garnish || '')
  const [sauceTechnique, setSauceTechnique] = useState(guide?.sauce_technique || '')
  const [temperatureNotes, setTemperatureNotes] = useState(guide?.temperature_notes || '')
  const [referencePhotoUrl, setReferencePhotoUrl] = useState(guide?.reference_photo_url || '')
  const [specialInstructions, setSpecialInstructions] = useState(guide?.special_instructions || '')
  const [showVesselSuggestions, setShowVesselSuggestions] = useState(false)

  const addComponent = () => {
    setComponents([...components, { name: '', placement: '', technique: '', notes: '' }])
  }

  const removeComponent = (index: number) => {
    if (components.length <= 1) return
    setComponents(components.filter((_, i) => i !== index))
  }

  const updateComponent = (index: number, field: keyof PlatingComponent, value: string) => {
    const updated = [...components]
    updated[index] = { ...updated[index], [field]: value }
    setComponents(updated)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Filter out empty components
    const filteredComponents = components.filter(c => c.name.trim() && c.placement.trim())

    startTransition(async () => {
      try {
        if (guide) {
          // Update
          const input: UpdatePlatingGuideInput = {
            dish_name: dishName,
            vessel: vessel || null,
            components: filteredComponents,
            garnish: garnish || null,
            sauce_technique: sauceTechnique || null,
            temperature_notes: temperatureNotes || null,
            reference_photo_url: referencePhotoUrl || null,
            special_instructions: specialInstructions || null,
          }
          const updated = await updatePlatingGuide(guide.id, input)
          onSave?.(updated)
        } else {
          // Create
          const input: CreatePlatingGuideInput = {
            recipe_id: recipeId || null,
            dish_name: dishName,
            vessel: vessel || null,
            components: filteredComponents,
            garnish: garnish || null,
            sauce_technique: sauceTechnique || null,
            temperature_notes: temperatureNotes || null,
            reference_photo_url: referencePhotoUrl || null,
            special_instructions: specialInstructions || null,
          }
          const created = await createPlatingGuide(input)
          onSave?.(created)
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to save plating guide'
        setError(message)
      }
    })
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{guide ? 'Edit Plating Guide' : 'New Plating Guide'}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Dish name */}
          <Input
            label="Dish Name"
            value={dishName}
            onChange={e => setDishName(e.target.value)}
            placeholder="e.g. Pan-Seared Duck Breast"
            required
          />

          {/* Vessel */}
          <div className="relative">
            <Input
              label="Vessel / Plate"
              value={vessel}
              onChange={e => setVessel(e.target.value)}
              onFocus={() => setShowVesselSuggestions(true)}
              onBlur={() => setTimeout(() => setShowVesselSuggestions(false), 200)}
              placeholder="e.g. 10-inch white rimmed plate"
              helperText="What should the dish be served on?"
            />
            {showVesselSuggestions && !vessel && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {VESSEL_SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 text-stone-700"
                    onMouseDown={() => {
                      setVessel(s)
                      setShowVesselSuggestions(false)
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reference photo URL */}
          <Input
            label="Reference Photo URL"
            value={referencePhotoUrl}
            onChange={e => setReferencePhotoUrl(e.target.value)}
            placeholder="https://..."
            helperText="URL to a reference photo (upload to Supabase Storage first)"
          />

          {/* Components */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-stone-700">Components</label>
              <Button type="button" variant="ghost" onClick={addComponent} className="text-xs h-auto px-2 py-1">
                + Add Component
              </Button>
            </div>
            <div className="space-y-4">
              {components.map((comp, i) => (
                <div key={i} className="bg-stone-50 rounded-lg p-4 space-y-3 relative">
                  {components.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeComponent(i)}
                      className="absolute top-2 right-2 text-stone-400 hover:text-red-500 text-sm"
                      aria-label="Remove component"
                    >
                      x
                    </button>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Component Name"
                      value={comp.name}
                      onChange={e => updateComponent(i, 'name', e.target.value)}
                      placeholder="e.g. Duck breast"
                    />
                    <Input
                      label="Placement"
                      value={comp.placement}
                      onChange={e => updateComponent(i, 'placement', e.target.value)}
                      placeholder="e.g. Center-left, sliced at 45 degrees"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Technique"
                      value={comp.technique || ''}
                      onChange={e => updateComponent(i, 'technique', e.target.value)}
                      placeholder="e.g. Fan 5 slices"
                    />
                    <Input
                      label="Notes"
                      value={comp.notes || ''}
                      onChange={e => updateComponent(i, 'notes', e.target.value)}
                      placeholder="e.g. Skin side up"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Garnish */}
          <Textarea
            label="Garnish"
            value={garnish}
            onChange={e => setGarnish(e.target.value)}
            placeholder="e.g. Microgreens at 2 o'clock, edible flowers scattered"
            rows={2}
          />

          {/* Sauce technique */}
          <Textarea
            label="Sauce Technique"
            value={sauceTechnique}
            onChange={e => setSauceTechnique(e.target.value)}
            placeholder="e.g. Swoosh of jus from 6 to 12 o'clock using offset spatula"
            rows={2}
          />

          {/* Temperature notes */}
          <Textarea
            label="Temperature Notes"
            value={temperatureNotes}
            onChange={e => setTemperatureNotes(e.target.value)}
            placeholder="e.g. Plate must be warm. Run under heat lamp 30 sec before plating"
            rows={2}
          />

          {/* Special instructions */}
          <Textarea
            label="Special Instructions"
            value={specialInstructions}
            onChange={e => setSpecialInstructions(e.target.value)}
            placeholder="Any additional notes for the plating team"
            rows={3}
          />
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="primary" disabled={isPending || !dishName.trim()}>
            {isPending ? 'Saving...' : guide ? 'Update Guide' : 'Create Guide'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
