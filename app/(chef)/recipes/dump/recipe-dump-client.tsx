'use client'

// Recipe Dump Client - Dead simple recipe capture
// 1. Type the name
// 2. Dump everything you know
// 3. Ollama parses it
// 4. Review + save
// 5. Optionally add a variation (creates a family)

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { toast } from 'sonner'
import {
  createRecipe,
  addIngredientToRecipe,
  createRecipeFamily,
  createRecipeInFamily,
  assignRecipeToFamily,
} from '@/lib/recipes/actions'
import { parseRecipeFromText } from '@/lib/ai/parse-recipe'
import type { ParsedIngredient } from '@/lib/ai/parse-recipe-schema'
import type { RecipeFamily } from '@/lib/recipes/actions'

type SavedRecipe = {
  id: string
  name: string
  familyId: string | null
  familyName: string | null
}

type ParsedResult = {
  name: string
  category: string
  description: string | null
  method: string
  method_detailed: string | null
  ingredients: ParsedIngredient[]
  yield_quantity: number | null
  yield_unit: string | null
  yield_description: string | null
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  total_time_minutes: number | null
  dietary_tags: string[]
  allergen_flags: string[]
  adaptations: string | null
  notes: string | null
}

type Step = 'input' | 'parsing' | 'review' | 'saving' | 'saved'

type Props = {
  existingFamilies: RecipeFamily[]
}

export function RecipeDumpClient({ existingFamilies }: Props) {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Core state
  const [step, setStep] = useState<Step>('input')
  const [recipeName, setRecipeName] = useState('')
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState<ParsedResult | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  // Saved recipe tracking (for variation flow)
  const [savedRecipe, setSavedRecipe] = useState<SavedRecipe | null>(null)
  const [savedCount, setSavedCount] = useState(0)

  // Variation mode
  const [variationMode, setVariationMode] = useState(false)
  const [variationLabel, setVariationLabel] = useState('')

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // ---- STEP 1: Parse ----
  const handleParse = () => {
    if (!rawText.trim()) return
    setError('')
    setStep('parsing')

    startTransition(async () => {
      try {
        const input = recipeName.trim() ? `${recipeName.trim()}: ${rawText.trim()}` : rawText.trim()
        const result = await parseRecipeFromText(input)
        setParsed(result.parsed)
        // Use the parsed name, or fall back to what the user typed
        if (!recipeName.trim() && result.parsed.name) {
          setRecipeName(result.parsed.name)
        }
        setStep('review')
      } catch (err: any) {
        setError(err.message || 'Failed to parse recipe. Is Ollama running?')
        setStep('input')
      }
    })
  }

  // ---- STEP 2: Save ----
  const handleSave = () => {
    if (!parsed) return
    setStep('saving')

    startTransition(async () => {
      try {
        const recipeResult = await createRecipe({
          name: recipeName.trim() || parsed.name,
          category: parsed.category as any,
          method: parsed.method,
          method_detailed: parsed.method_detailed || undefined,
          description: parsed.description || undefined,
          notes: parsed.notes || undefined,
          adaptations: parsed.adaptations || undefined,
          prep_time_minutes: parsed.prep_time_minutes || undefined,
          cook_time_minutes: parsed.cook_time_minutes || undefined,
          total_time_minutes: parsed.total_time_minutes || undefined,
          yield_quantity: parsed.yield_quantity || undefined,
          yield_unit: parsed.yield_unit || undefined,
          yield_description: parsed.yield_description || undefined,
          dietary_tags: parsed.dietary_tags,
        })

        const recipeId = recipeResult.recipe.id

        // Add ingredients
        for (let i = 0; i < parsed.ingredients.length; i++) {
          const ing = parsed.ingredients[i]
          try {
            await addIngredientToRecipe(recipeId, {
              ingredient_name: ing.name,
              ingredient_category: ing.category || 'other',
              ingredient_default_unit: ing.unit || 'unit',
              quantity: ing.quantity || 1,
              unit: ing.unit || 'unit',
              preparation_notes: ing.preparation_notes || undefined,
              is_optional: ing.is_optional || false,
              sort_order: i,
            })
          } catch (ingredientErr) {
            console.error(`[RecipeDump] Failed to add ingredient: ${ing.name}`, ingredientErr)
          }
        }

        // If we're in variation mode, assign to existing family
        if (variationMode && savedRecipe?.familyId) {
          await assignRecipeToFamily(
            recipeId,
            savedRecipe.familyId,
            variationLabel.trim() || undefined
          )
        }

        const saved: SavedRecipe = {
          id: recipeId,
          name: recipeName.trim() || parsed.name,
          familyId: savedRecipe?.familyId || null,
          familyName: savedRecipe?.familyName || null,
        }
        setSavedRecipe(saved)
        setSavedCount((c) => c + 1)
        setStep('saved')
        toast.success(`Saved: ${saved.name}`)
      } catch (err: any) {
        setError(err.message || 'Failed to save recipe')
        setStep('review')
      }
    })
  }

  // ---- Create family from saved recipe and start variation ----
  const handleStartVariation = () => {
    if (!savedRecipe) return

    startTransition(async () => {
      try {
        let familyId = savedRecipe.familyId
        let familyName = savedRecipe.familyName

        // Create a family if this recipe doesn't have one yet
        if (!familyId) {
          const baseName = savedRecipe.name
          const familyResult = await createRecipeFamily(
            baseName,
            undefined,
            savedRecipe.id,
            'Classic'
          )
          familyId = familyResult.family.id
          familyName = baseName
          setSavedRecipe({ ...savedRecipe, familyId, familyName })
          toast.success(`Created family: ${baseName}`)
        }

        // Reset form for variation entry
        setVariationMode(true)
        setVariationLabel('')
        setRecipeName('')
        setRawText('')
        setParsed(null)
        setError('')
        setStep('input')

        // Focus the variation label or textarea
        setTimeout(() => textareaRef.current?.focus(), 100)
      } catch (err: any) {
        toast.error(err.message || 'Failed to create recipe family')
      }
    })
  }

  // ---- Start fresh (new recipe, no family) ----
  const handleNewRecipe = () => {
    setVariationMode(false)
    setVariationLabel('')
    setRecipeName('')
    setRawText('')
    setParsed(null)
    setError('')
    setSavedRecipe(null)
    setStep('input')
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  // ---- Keyboard shortcut: Ctrl+Enter to parse/save ----
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (step === 'input') handleParse()
      else if (step === 'review') handleSave()
    }
  }

  return (
    <div className="space-y-4" onKeyDown={handleKeyDown}>
      {/* Variation mode banner */}
      {variationMode && savedRecipe?.familyName && (
        <Alert>
          <div className="flex items-center gap-2">
            <Badge variant="info">Variation</Badge>
            <span className="text-sm">
              Adding variation to <strong>{savedRecipe.familyName}</strong> family
            </span>
          </div>
        </Alert>
      )}

      {/* Session counter */}
      {savedCount > 0 && step !== 'saved' && (
        <p className="text-xs text-zinc-500">
          {savedCount} recipe{savedCount !== 1 ? 's' : ''} saved this session
        </p>
      )}

      {/* ---- INPUT STEP ---- */}
      {(step === 'input' || step === 'parsing') && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="space-y-4 pt-6">
            {/* Variation label (only in variation mode) */}
            {variationMode && (
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Variation name
                </label>
                <Input
                  placeholder="e.g., Vegan, Gluten-Free, Infused Butter, Kid-Friendly..."
                  value={variationLabel}
                  onChange={(e) => setVariationLabel(e.target.value)}
                  className="border-zinc-700 bg-zinc-800"
                />
              </div>
            )}

            {/* Recipe name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                {variationMode ? 'Recipe name (this version)' : 'Recipe name'}
              </label>
              <Input
                placeholder="e.g., Chocolate Lava Cake, Pan Seared Salmon..."
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                className="border-zinc-700 bg-zinc-800 text-lg"
                autoFocus={variationMode}
              />
              <p className="mt-1 text-xs text-zinc-500">
                Optional. Ollama will figure it out from the text if you skip this.
              </p>
            </div>

            {/* The dump zone */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                Dump everything you know
              </label>
              <Textarea
                ref={textareaRef}
                placeholder={`Just type it how you'd say it...

"6oz dark chocolate, stick of butter, melt together. 3 eggs, quarter cup sugar, whisk until thick. Fold in 2 tbsp flour and pinch of salt. Ramekins, 425 for 12-14 min. Center should be jiggly. Serves 4."

Ingredients, method, times, yield, dietary notes - whatever you remember. Ollama handles the rest.`}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="min-h-[200px] border-zinc-700 bg-zinc-800 text-base leading-relaxed"
                autoFocus={!variationMode}
              />
            </div>

            {error && (
              <Alert>
                <p className="text-sm text-red-400">{error}</p>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">Ctrl+Enter to parse</p>
              <Button onClick={handleParse} disabled={!rawText.trim() || step === 'parsing'}>
                {step === 'parsing' ? 'Parsing with Ollama...' : 'Parse Recipe'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- REVIEW STEP ---- */}
      {(step === 'review' || step === 'saving') && parsed && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{recipeName.trim() || parsed.name}</h2>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge>{parsed.category}</Badge>
                  {parsed.dietary_tags.map((tag) => (
                    <Badge key={tag} variant="success">
                      {tag}
                    </Badge>
                  ))}
                  {parsed.allergen_flags.map((flag) => (
                    <Badge key={flag} variant="warning">
                      {flag}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button variant="ghost" onClick={() => setStep('input')}>
                Edit
              </Button>
            </div>

            {parsed.description && <p className="text-sm text-zinc-400">{parsed.description}</p>}

            {/* Ingredients */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-300">
                Ingredients ({parsed.ingredients.length})
              </h3>
              <div className="grid gap-1">
                {parsed.ingredients.map((ing, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-400">
                      {ing.quantity} {ing.unit}
                    </span>
                    <span className="text-white">{ing.name}</span>
                    {ing.preparation_notes && (
                      <span className="text-zinc-500">({ing.preparation_notes})</span>
                    )}
                    {ing.estimated && <Badge variant="default">est.</Badge>}
                    {ing.is_optional && <Badge variant="info">optional</Badge>}
                  </div>
                ))}
              </div>
            </div>

            {/* Method */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-300">Method</h3>
              <p className="whitespace-pre-wrap text-sm text-zinc-400">{parsed.method}</p>
            </div>

            {/* Times & Yield */}
            <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
              {parsed.prep_time_minutes && <span>Prep: {parsed.prep_time_minutes}min</span>}
              {parsed.cook_time_minutes && <span>Cook: {parsed.cook_time_minutes}min</span>}
              {parsed.total_time_minutes && <span>Total: {parsed.total_time_minutes}min</span>}
              {parsed.yield_description && <span>Yield: {parsed.yield_description}</span>}
            </div>

            {error && (
              <Alert>
                <p className="text-sm text-red-400">{error}</p>
              </Alert>
            )}

            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
              <p className="text-xs text-zinc-500">Ctrl+Enter to save</p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep('input')}>
                  Back
                </Button>
                <Button onClick={handleSave} disabled={step === 'saving'}>
                  {step === 'saving' ? 'Saving...' : 'Save Recipe'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- SAVED STEP ---- */}
      {step === 'saved' && savedRecipe && (
        <Card className="border-emerald-900/50 bg-emerald-950/20">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-900/50">
                <svg
                  className="h-5 w-5 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{savedRecipe.name}</h2>
                <p className="text-sm text-emerald-400">
                  Saved to your recipe book
                  {savedRecipe.familyName && <> (in {savedRecipe.familyName} family)</>}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleStartVariation}>+ Add Variation</Button>
              <Button variant="secondary" onClick={handleNewRecipe}>
                New Recipe
              </Button>
              <Link href={`/recipes/${savedRecipe.id}`}>
                <Button variant="ghost">View Recipe</Button>
              </Link>
              <Link href="/recipes">
                <Button variant="ghost">Recipe Book</Button>
              </Link>
            </div>

            <p className="text-xs text-zinc-500">
              {savedCount} recipe{savedCount !== 1 ? 's' : ''} saved this session
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
