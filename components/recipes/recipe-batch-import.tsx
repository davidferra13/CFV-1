'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { fetchRecipeFromUrl, saveImportedRecipe } from '@/lib/recipes/import-actions'

type Props = {
  open: boolean
  onClose: () => void
}

type ImportResult = {
  url: string
  status: 'pending' | 'fetching' | 'saving' | 'success' | 'failed'
  name?: string
  ingredientCount?: number
  error?: string
  recipeId?: string
}

export function RecipeBatchImport({ open, onClose }: Props) {
  const router = useRouter()
  const [urlText, setUrlText] = useState('')
  const [results, setResults] = useState<ImportResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [phase, setPhase] = useState<'input' | 'running' | 'done'>('input')

  if (!open) return null

  const handleClose = () => {
    if (isRunning) return
    setUrlText('')
    setResults([])
    setPhase('input')
    onClose()
  }

  const parseUrls = (): string[] => {
    return urlText
      .split('\n')
      .map((line) => line.trim())
      .filter(
        (line) => line.length > 0 && (line.startsWith('http://') || line.startsWith('https://'))
      )
  }

  const handleImportAll = async () => {
    const urls = parseUrls()
    if (urls.length === 0) return

    setIsRunning(true)
    setPhase('running')

    const initial: ImportResult[] = urls.map((url) => ({
      url,
      status: 'pending' as const,
    }))
    setResults(initial)

    for (let i = 0; i < urls.length; i++) {
      // Update status to fetching
      setResults((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: 'fetching' as const } : r))
      )

      try {
        const fetchResult = await fetchRecipeFromUrl(urls[i])
        if (!fetchResult.success || !fetchResult.preview) {
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i
                ? {
                    ...r,
                    status: 'failed' as const,
                    error: fetchResult.error || 'Could not parse recipe',
                  }
                : r
            )
          )
          continue
        }

        // Update status to saving
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: 'saving' as const, name: fetchResult.preview!.name } : r
          )
        )

        const saveResult = await saveImportedRecipe(fetchResult.preview)
        if (saveResult.success) {
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i
                ? {
                    ...r,
                    status: 'success' as const,
                    name: saveResult.name,
                    ingredientCount: saveResult.ingredientCount,
                    recipeId: saveResult.recipeId,
                  }
                : r
            )
          )
        } else {
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, status: 'failed' as const, error: saveResult.error } : r
            )
          )
        }
      } catch (err) {
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: 'failed' as const, error: 'Unexpected error' } : r
          )
        )
      }
    }

    setIsRunning(false)
    setPhase('done')
    router.refresh()
  }

  const urlCount = parseUrls().length
  const successCount = results.filter((r) => r.status === 'success').length
  const failedCount = results.filter((r) => r.status === 'failed').length
  const currentIndex = results.findIndex((r) => r.status === 'fetching' || r.status === 'saving')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold text-stone-900">Batch Import Recipes</h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isRunning}
            className="text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-50"
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
          {phase === 'input' && (
            <div className="space-y-4">
              <p className="text-sm text-stone-600">
                Paste recipe URLs below (one per line). Works with AllRecipes, Food Network,
                Epicurious, Bon Appetit, and most recipe sites with structured data.
              </p>
              <textarea
                className="w-full h-48 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none font-mono"
                placeholder={`https://www.allrecipes.com/recipe/12345/...\nhttps://www.foodnetwork.com/recipes/...\nhttps://www.bonappetit.com/recipe/...`}
                value={urlText}
                onChange={(e) => setUrlText(e.target.value)}
                autoFocus
              />
              {urlCount > 0 && (
                <p className="text-sm text-stone-500">
                  {urlCount} URL{urlCount !== 1 ? 's' : ''} detected
                </p>
              )}
            </div>
          )}

          {(phase === 'running' || phase === 'done') && (
            <div className="space-y-2">
              {/* Progress bar */}
              {phase === 'running' && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-stone-600 mb-1">
                    <span>
                      Importing {currentIndex >= 0 ? currentIndex + 1 : results.length} of{' '}
                      {results.length}
                    </span>
                    <span>
                      {successCount} done, {failedCount} failed
                    </span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-600 rounded-full transition-all duration-300"
                      style={{
                        width: `${((successCount + failedCount) / results.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {phase === 'done' && (
                <div className="mb-4 p-3 rounded-lg bg-stone-50 border border-stone-200">
                  <p className="text-sm font-medium text-stone-900">
                    Import complete: {successCount} imported, {failedCount} failed
                  </p>
                </div>
              )}

              {/* Results list */}
              {results.map((result, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    result.status === 'success'
                      ? 'border-green-200 bg-green-50/50'
                      : result.status === 'failed'
                        ? 'border-red-200 bg-red-50/50'
                        : result.status === 'fetching' || result.status === 'saving'
                          ? 'border-brand-200 bg-brand-50/50'
                          : 'border-stone-100 bg-white'
                  }`}
                >
                  {/* Status indicator */}
                  <div className="shrink-0">
                    {result.status === 'pending' && (
                      <div className="w-5 h-5 rounded-full border-2 border-stone-200" />
                    )}
                    {(result.status === 'fetching' || result.status === 'saving') && (
                      <svg
                        className="animate-spin h-5 w-5 text-brand-600"
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
                    )}
                    {result.status === 'success' && (
                      <svg
                        className="h-5 w-5 text-green-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {result.status === 'failed' && (
                      <svg
                        className="h-5 w-5 text-red-500"
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
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">
                      {result.name ||
                        new URL(result.url).hostname + new URL(result.url).pathname.slice(0, 40)}
                    </p>
                    {result.status === 'fetching' && (
                      <p className="text-xs text-stone-500">Fetching recipe data...</p>
                    )}
                    {result.status === 'saving' && (
                      <p className="text-xs text-stone-500">Saving to recipe book...</p>
                    )}
                    {result.status === 'success' && result.ingredientCount != null && (
                      <p className="text-xs text-green-700">
                        {result.ingredientCount} ingredient{result.ingredientCount !== 1 ? 's' : ''}
                      </p>
                    )}
                    {result.status === 'failed' && result.error && (
                      <p className="text-xs text-red-600">{result.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100 flex justify-end gap-2 shrink-0">
          {phase === 'input' && (
            <>
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleImportAll} disabled={urlCount === 0}>
                Import {urlCount} Recipe{urlCount !== 1 ? 's' : ''}
              </Button>
            </>
          )}
          {phase === 'done' && <Button onClick={handleClose}>Done</Button>}
        </div>
      </div>
    </div>
  )
}
