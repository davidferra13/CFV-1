'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { createRecipe, addIngredientToRecipe, linkRecipeToComponent } from '@/lib/recipes/actions'
import { parseRecipeFromText } from '@/lib/ai/parse-recipe'
import type { ParsedIngredient } from '@/lib/ai/parse-recipe'

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
  const [quickCaptureId, setQuickCaptureId] = useState<string | null>(null)
  const [rawText, setRawText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (components.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-4">
          <p className="text-green-800 font-medium">All recipes recorded for this event</p>
        </CardContent>
      </Card>
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

      // If AI is available, parse the text
      if (aiConfigured) {
        const result = await parseRecipeFromText(`${comp.name}: ${rawText}`)
        recipeName = result.parsed.name || comp.name
        recipeCategory = result.parsed.category || comp.category || 'other'
        recipeMethod = result.parsed.method || rawText.trim()
        ingredientsList = result.parsed.ingredients || []
      }

      // Create recipe
      const recipeResult = await createRecipe({
        name: recipeName,
        category: recipeCategory,
        method: recipeMethod,
      })

      // Add parsed ingredients
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

      // Link to component
      await linkRecipeToComponent(recipeResult.recipe.id, comp.id)

      // Remove from list
      setComponents(prev => prev.filter(c => c.id !== comp.id))
      setQuickCaptureId(null)
      setRawText('')
      setSuccess(`Recipe "${recipeName}" saved and linked to ${comp.name}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save recipe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-amber-200">
      <CardHeader>
        <CardTitle>Recipe Capture</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-stone-600">
          {components.length} component{components.length !== 1 ? 's' : ''} from this dinner {components.length !== 1 ? "don't" : "doesn't"} have saved recipes:
        </p>

        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <div className="space-y-3">
          {components.map((comp) => (
            <div key={comp.id} className="border border-stone-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-stone-900">{comp.name}</span>
                  {comp.category && (
                    <Badge variant="default">{comp.category}</Badge>
                  )}
                </div>
                <div className="flex gap-2">
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
                  <Link href={`/recipes/new?component=${comp.id}&componentName=${encodeURIComponent(comp.name)}&componentCategory=${encodeURIComponent(comp.category || 'other')}`}>
                    <Button size="sm">Record Recipe</Button>
                  </Link>
                </div>
              </div>

              {quickCaptureId === comp.id && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`Describe how you made ${comp.name} tonight...`}
                    rows={4}
                    disabled={loading}
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
      </CardContent>
    </Card>
  )
}
