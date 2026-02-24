'use client'

// Recipe Capture Prompt — Post-Event Banner
// Shown on event detail when components have no recipe.
// Upgraded from quiet card to prominent, action-oriented banner.
// Also supports quick in-place capture for single dishes.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { createRecipe, addIngredientToRecipe, linkRecipeToComponent } from '@/lib/recipes/actions'
import { parseRecipeFromText } from '@/lib/ai/parse-recipe'
import type { ParsedIngredient } from '@/lib/ai/parse-recipe'
import { BookOpen, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

type UnrecordedComponent = {
  id: string
  name: string
  category: string
}

type Props = {
  eventId: string
  unrecordedComponents: UnrecordedComponent[]
  aiConfigured: boolean
}

export function RecipeCapturePrompt({ eventId, unrecordedComponents, aiConfigured }: Props) {
  const router = useRouter()
  const [components, setComponents] = useState(unrecordedComponents)
  const [expanded, setExpanded] = useState(true)
  const [quickCaptureId, setQuickCaptureId] = useState<string | null>(null)
  const [rawText, setRawText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // All caught up — show a quiet success state
  if (components.length === 0) {
    return (
      <div className="flex items-center gap-3 bg-green-950 border border-green-200 rounded-lg px-4 py-3">
        <BookOpen className="h-5 w-5 text-emerald-600 shrink-0" />
        <p className="text-sm font-medium text-green-900">All recipes recorded for this event</p>
      </div>
    )
  }

  const handleQuickCapture = async (comp: UnrecordedComponent) => {
    if (!rawText.trim()) return
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      let recipeName = comp.name
      let recipeCategory = comp.category || 'other'
      let recipeMethod = rawText.trim()
      let ingredientsList: ParsedIngredient[] = []

      if (aiConfigured) {
        const result = await parseRecipeFromText(`${comp.name}: ${rawText}`)
        recipeName = result.parsed.name || comp.name
        recipeCategory = result.parsed.category || comp.category || 'other'
        recipeMethod = result.parsed.method || rawText.trim()
        ingredientsList = result.parsed.ingredients || []
      }

      const recipeResult = await createRecipe({
        name: recipeName,
        category: recipeCategory,
        method: recipeMethod,
      })

      for (let i = 0; i < ingredientsList.length; i++) {
        const ing = ingredientsList[i]
        await addIngredientToRecipe(recipeResult.recipe.id, {
          ingredient_name: ing.name,
          ingredient_category: ing.category || 'other',
          ingredient_default_unit: ing.unit || 'unit',
          quantity: ing.quantity || 1,
          unit: ing.unit || 'unit',
          preparation_notes: ing.preparation_notes || undefined,
          is_optional: ing.is_optional || false,
          sort_order: i,
        })
      }

      await linkRecipeToComponent(recipeResult.recipe.id, comp.id)

      setComponents((prev) => prev.filter((c) => c.id !== comp.id))
      setQuickCaptureId(null)
      setRawText('')
      setSuccess(`"${recipeName}" saved and linked`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save recipe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-2 border-amber-400 rounded-lg overflow-hidden">
      {/* Banner header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-amber-950 hover:bg-amber-900 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <span className="font-semibold text-amber-900">
            {components.length} dish{components.length !== 1 ? 'es' : ''} from this event{' '}
            {components.length !== 1 ? 'have' : 'has'} no recipe recorded
          </span>
          <Badge variant="warning">{components.length}</Badge>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/recipes/sprint"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
          >
            Sprint Mode
          </Link>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-amber-600" />
          ) : (
            <ChevronDown className="h-4 w-4 text-amber-600" />
          )}
        </div>
      </button>

      {/* Expanded list of unrecorded components */}
      {expanded && (
        <div className="bg-surface border-t border-amber-200 p-4 space-y-3">
          {error && <Alert variant="error">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <p className="text-xs text-stone-500">
            Record while the dinner is fresh. Paste a quick description — we'll structure it.
          </p>

          {components.map((comp) => (
            <div key={comp.id} className="border border-stone-700 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-stone-100 truncate">{comp.name}</span>
                  {comp.category && <Badge variant="default">{comp.category}</Badge>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setQuickCaptureId(quickCaptureId === comp.id ? null : comp.id)
                      setRawText('')
                      setError('')
                    }}
                  >
                    {quickCaptureId === comp.id ? 'Cancel' : 'Quick Capture'}
                  </Button>
                  <Link
                    href={`/recipes/new?component=${comp.id}&componentName=${encodeURIComponent(comp.name)}&componentCategory=${encodeURIComponent(comp.category || 'other')}`}
                  >
                    <Button size="sm">Full Editor</Button>
                  </Link>
                </div>
              </div>

              {quickCaptureId === comp.id && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`How did you make ${comp.name}? Ingredients, technique, timing...`}
                    rows={4}
                    disabled={loading}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleQuickCapture(comp)}
                      disabled={loading || !rawText.trim()}
                    >
                      {loading ? 'Saving...' : aiConfigured ? 'Parse & Save' : 'Save'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
