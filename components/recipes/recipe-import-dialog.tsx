// Recipe Import from URL Dialog
// Modal that fetches a recipe from a URL, previews it, and saves it to the chef's collection.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { StepProgress, useStepProgress } from '@/components/ui/step-progress'
import { fetchRecipeFromUrl, saveImportedRecipe } from '@/lib/recipes/import-actions'
import type { ImportedRecipePreview } from '@/lib/recipes/import-actions'

type Props = {
  open: boolean
  onClose: () => void
}

type Step = 'input' | 'preview' | 'saving' | 'done'

export function RecipeImportDialog({ open, onClose }: Props) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [step, setStep] = useState<Step>('input')
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ImportedRecipePreview | null>(null)
  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null)
  const [savedName, setSavedName] = useState('')
  const [savedIngredientCount, setSavedIngredientCount] = useState(0)
  const [isFetching, startFetchTransition] = useTransition()
  const [isSaving, startSaveTransition] = useTransition()
  const saveSteps = useStepProgress([
    'Creating recipe record',
    'Processing ingredients',
    'Finalizing',
  ])

  if (!open) return null

  const handleClose = () => {
    setUrl('')
    setStep('input')
    setError(null)
    setPreview(null)
    setSavedRecipeId(null)
    saveSteps.reset()
    onClose()
  }

  const handleFetch = () => {
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }

    setError(null)
    startFetchTransition(async () => {
      try {
        const result = await fetchRecipeFromUrl(url.trim())
        if (result.success) {
          setPreview(result.preview)
          setStep('preview')
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const handleSave = () => {
    if (!preview) return

    setStep('saving')
    saveSteps.reset()
    startSaveTransition(async () => {
      try {
        // Step 1: Creating recipe record (advance past it when server responds)
        const result = await saveImportedRecipe(preview)
        saveSteps.advance() // -> Processing ingredients
        if (result.success) {
          saveSteps.advance() // -> Finalizing
          setTimeout(() => {
            saveSteps.advance() // -> all done
            setSavedRecipeId(result.recipeId)
            setSavedName(result.name)
            setSavedIngredientCount(result.ingredientCount)
            setStep('done')
          }, 400)
        } else {
          saveSteps.fail(result.error)
          setError(result.error)
          setStep('preview')
        }
      } catch (err) {
        saveSteps.fail('Failed to save recipe')
        setError('Failed to save recipe. Please try again.')
        setStep('preview')
      }
    })
  }

  const handleViewRecipe = () => {
    if (savedRecipeId) {
      router.push(`/recipes/${savedRecipeId}`)
    }
    handleClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold text-stone-900">Import Recipe from URL</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-stone-400 hover:text-stone-600 transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* Step 1: URL Input */}
          {step === 'input' && (
            <div className="space-y-4">
              <p className="text-sm text-stone-600">
                Paste a recipe URL from any major cooking site. Works best with sites that use
                structured recipe data (most popular recipe sites do).
              </p>

              <Input
                type="url"
                placeholder="https://www.example.com/recipes/..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFetch()
                }}
                error={error || undefined}
                autoFocus
              />

              {isFetching && (
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Fetching recipe...
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              {/* Recipe name + category */}
              <div>
                <h3 className="text-xl font-bold text-stone-900">{preview.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge>{preview.category}</Badge>
                  {preview.cuisine && (
                    <span className="text-sm text-stone-500">{preview.cuisine}</span>
                  )}
                </div>
              </div>

              {/* Description */}
              {preview.description && (
                <p className="text-sm text-stone-600 line-clamp-3">{preview.description}</p>
              )}

              {/* Times + Yield */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
                {preview.prepTimeMinutes && <span>Prep: {preview.prepTimeMinutes} min</span>}
                {preview.cookTimeMinutes && <span>Cook: {preview.cookTimeMinutes} min</span>}
                {preview.totalTimeMinutes && <span>Total: {preview.totalTimeMinutes} min</span>}
                {preview.yieldDescription && <span>Yield: {preview.yieldDescription}</span>}
              </div>

              {/* Ingredients */}
              {preview.ingredients.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-stone-700 mb-2">
                    Ingredients ({preview.ingredients.length})
                  </h4>
                  <ul className="space-y-1 max-h-48 overflow-y-auto">
                    {preview.ingredients.map((ing, i) => (
                      <li key={i} className="text-sm text-stone-600 flex items-start gap-2">
                        <span className="text-stone-300 shrink-0 mt-0.5">-</span>
                        <span>
                          {ing.parsed.quantity != null && (
                            <span className="font-medium text-stone-800">
                              {formatQuantity(ing.parsed.quantity)}
                            </span>
                          )}{' '}
                          {ing.parsed.unit && (
                            <span className="text-stone-500">{ing.parsed.unit}</span>
                          )}{' '}
                          <span>{ing.parsed.name}</span>
                          {ing.parsed.preparation && (
                            <span className="text-stone-400">, {ing.parsed.preparation}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Instructions preview */}
              {preview.method && (
                <div>
                  <h4 className="text-sm font-semibold text-stone-700 mb-2">Instructions</h4>
                  <p className="text-sm text-stone-600 whitespace-pre-line line-clamp-6">
                    {preview.method}
                  </p>
                  {preview.method.split('\n').length > 6 && (
                    <p className="text-xs text-stone-400 mt-1">
                      ...and more (will be saved in full)
                    </p>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}

          {/* Step 3: Saving */}
          {step === 'saving' && (
            <div className="py-4">
              <StepProgress steps={saveSteps.steps} compact />
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-green-600"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-stone-900">{savedName}</h3>
              <p className="text-sm text-stone-600">
                Imported with {savedIngredientCount} ingredient
                {savedIngredientCount !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100 flex justify-end gap-2 shrink-0">
          {step === 'input' && (
            <>
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleFetch} loading={isFetching} disabled={!url.trim()}>
                Fetch Recipe
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setStep('input')
                  setPreview(null)
                  setError(null)
                }}
              >
                Back
              </Button>
              <Button onClick={handleSave} loading={isSaving}>
                Save to Recipe Book
              </Button>
            </>
          )}

          {step === 'done' && (
            <>
              <Button variant="secondary" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleViewRecipe}>View Recipe</Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Format a quantity number for display.
 * Converts common decimals back to fractions for readability.
 */
function formatQuantity(qty: number): string {
  // Common fraction display
  const fractionMap: Record<string, string> = {
    '0.25': '1/4',
    '0.33': '1/3',
    '0.5': '1/2',
    '0.67': '2/3',
    '0.75': '3/4',
    '1.25': '1 1/4',
    '1.33': '1 1/3',
    '1.5': '1 1/2',
    '1.67': '1 2/3',
    '1.75': '1 3/4',
    '2.25': '2 1/4',
    '2.33': '2 1/3',
    '2.5': '2 1/2',
    '2.75': '2 3/4',
  }

  // Round to 2 decimal places for lookup
  const rounded = Math.round(qty * 100) / 100
  const key = rounded.toFixed(2).replace(/0$/, '').replace(/\.$/, '')

  if (fractionMap[key]) return fractionMap[key]

  // If it's a whole number, show without decimals
  if (Number.isInteger(qty)) return qty.toString()

  // Otherwise show up to 2 decimal places
  return qty.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}
