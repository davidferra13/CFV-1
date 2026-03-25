/* eslint-disable @next/next/no-img-element */
'use client'

// Recipe Photo Import Component
// Upload photos of recipe cards, printed recipes, handwritten notes, cookbook pages.
// Each photo is parsed via Gemini vision into a structured recipe.
// Chef reviews each parsed result and approves before saving.

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { parseRecipeFromImage } from '@/lib/ai/parse-recipe-vision'
import { importRecipe } from '@/lib/ai/import-actions'
import type { ParsedRecipe, ParsedIngredient } from '@/lib/ai/parse-recipe-schema'
import type { ParseResult } from '@/lib/ai/parse'

const MAX_PHOTOS = 20
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB

type PhotoEntry = {
  id: string
  file: File
  preview: string
  status: 'queued' | 'parsing' | 'parsed' | 'error' | 'saving' | 'saved'
  recipe?: ParsedRecipe
  confidence?: string
  warnings?: string[]
  error?: string
  savedId?: string
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data:image/xxx;base64, prefix
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getMediaType(file: File): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic' {
  const type = file.type.toLowerCase()
  if (type === 'image/png') return 'image/png'
  if (type === 'image/webp') return 'image/webp'
  if (type === 'image/heic' || type === 'image/heif') return 'image/heic'
  return 'image/jpeg'
}

export function RecipePhotoImport() {
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // --- File selection ---
  const handleFilesSelected = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return
      const remaining = MAX_PHOTOS - photos.length
      const toAdd = Array.from(selectedFiles)
        .filter((f) => {
          if (
            !ACCEPTED_TYPES.includes(f.type.toLowerCase()) &&
            !f.name.toLowerCase().endsWith('.heic')
          )
            return false
          if (f.size > MAX_FILE_SIZE) return false
          return true
        })
        .slice(0, remaining)

      const newEntries: PhotoEntry[] = toAdd.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        status: 'queued' as const,
      }))

      setPhotos((prev) => [...prev, ...newEntries])
    },
    [photos.length]
  )

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const entry = prev.find((p) => p.id === id)
      if (entry) URL.revokeObjectURL(entry.preview)
      return prev.filter((p) => p.id !== id)
    })
  }, [])

  // --- Drop zone ---
  const [dragOver, setDragOver] = useState(false)
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      handleFilesSelected(e.dataTransfer.files)
    },
    [handleFilesSelected]
  )

  // --- Parse all queued photos ---
  const parseAll = async () => {
    const queued = photos.filter((p) => p.status === 'queued')
    if (queued.length === 0) return
    setIsProcessing(true)

    for (const photo of queued) {
      // Mark as parsing
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, status: 'parsing' } : p)))

      try {
        const base64 = await fileToBase64(photo.file)
        const mediaType = getMediaType(photo.file)
        const result = await parseRecipeFromImage(base64, mediaType)
        const parseResult = result as ParseResult<ParsedRecipe>

        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id
              ? {
                  ...p,
                  status: 'parsed',
                  recipe: parseResult.parsed,
                  confidence: parseResult.confidence,
                  warnings: parseResult.warnings,
                }
              : p
          )
        )
      } catch (err) {
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id
              ? {
                  ...p,
                  status: 'error',
                  error: err instanceof Error ? err.message : 'Failed to parse photo',
                }
              : p
          )
        )
      }
    }

    setIsProcessing(false)
  }

  // --- Save a single parsed recipe ---
  const saveRecipe = async (id: string) => {
    const photo = photos.find((p) => p.id === id)
    if (!photo?.recipe) return

    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'saving' } : p)))

    try {
      const result = await importRecipe(photo.recipe)
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: 'saved', savedId: (result.recipe as { id: string }).id } : p
        )
      )
    } catch (err) {
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status: 'error',
                error: err instanceof Error ? err.message : 'Failed to save recipe',
              }
            : p
        )
      )
    }
  }

  // --- Save all parsed recipes ---
  const saveAll = async () => {
    const parsed = photos.filter((p) => p.status === 'parsed' && p.recipe)
    for (const photo of parsed) {
      await saveRecipe(photo.id)
    }
  }

  // --- Edit a recipe field inline ---
  const updateRecipeField = (id: string, field: string, value: string) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== id || !p.recipe) return p
        return { ...p, recipe: { ...p.recipe, [field]: value } }
      })
    )
  }

  // --- Stats ---
  const queuedCount = photos.filter((p) => p.status === 'queued').length
  const parsingCount = photos.filter((p) => p.status === 'parsing').length
  const parsedCount = photos.filter((p) => p.status === 'parsed').length
  const savedCount = photos.filter((p) => p.status === 'saved').length
  const errorCount = photos.filter((p) => p.status === 'error').length

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Alert variant="info" title="Recipe Photo Import">
        <p className="text-sm mt-1">
          Photograph your recipe cards, printed recipes, handwritten notes, or cookbook pages.
          Upload up to {MAX_PHOTOS} photos at a time. Each photo will be analyzed and converted into
          a structured recipe for you to review before saving.
        </p>
      </Alert>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        className={`
          flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center
          cursor-pointer transition-colors
          ${
            dragOver
              ? 'border-orange-400 bg-orange-950/20'
              : 'border-stone-600 hover:border-stone-500 bg-stone-900/30'
          }
          ${photos.length >= MAX_PHOTOS ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <svg
          className="mb-3 h-10 w-10 text-stone-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
          />
        </svg>
        <p className="text-sm text-stone-300">
          Drop recipe photos here or <span className="text-orange-400 font-medium">browse</span>
        </p>
        <p className="mt-1 text-xs text-stone-500">
          JPG, PNG, WebP, HEIC - up to 15MB each - {MAX_PHOTOS - photos.length} remaining
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
      </div>

      {/* Action bar */}
      {photos.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-stone-400">
            {queuedCount > 0 && <Badge>{queuedCount} queued</Badge>}
            {parsingCount > 0 && <Badge variant="warning">{parsingCount} parsing</Badge>}
            {parsedCount > 0 && <Badge variant="success">{parsedCount} ready</Badge>}
            {savedCount > 0 && <Badge variant="info">{savedCount} saved</Badge>}
            {errorCount > 0 && <Badge variant="error">{errorCount} failed</Badge>}
          </div>
          <div className="ml-auto flex gap-2">
            {queuedCount > 0 && (
              <Button variant="primary" onClick={parseAll} disabled={isProcessing}>
                {isProcessing
                  ? `Parsing ${parsingCount}/${queuedCount + parsingCount}...`
                  : `Parse ${queuedCount} Photo${queuedCount === 1 ? '' : 's'}`}
              </Button>
            )}
            {parsedCount > 1 && (
              <Button variant="primary" onClick={saveAll}>
                Save All ({parsedCount})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Photo cards */}
      <div className="space-y-4">
        {photos.map((photo) => (
          <Card key={photo.id} className="overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              {/* Photo thumbnail */}
              <div className="relative sm:w-48 sm:min-h-[160px] flex-shrink-0">
                <img
                  src={photo.preview}
                  alt={photo.recipe?.name || photo.file.name}
                  className="h-40 w-full sm:h-full object-cover"
                />
                {photo.status !== 'saved' && (
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-red-600 transition-colors"
                    aria-label="Remove"
                  >
                    x
                  </button>
                )}
                {/* Status overlay */}
                {photo.status === 'parsing' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-white font-medium">Analyzing...</span>
                    </div>
                  </div>
                )}
                {photo.status === 'saving' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-white font-medium">Saving...</span>
                    </div>
                  </div>
                )}
                {photo.status === 'saved' && (
                  <div className="absolute inset-0 bg-emerald-900/50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-1">
                      <svg
                        className="h-8 w-8 text-emerald-400"
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
                      <span className="text-xs text-emerald-300 font-medium">Saved</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 p-4 min-w-0">
                {/* Queued state */}
                {photo.status === 'queued' && (
                  <div className="flex items-center gap-2 text-sm text-stone-400">
                    <span className="truncate">{photo.file.name}</span>
                    <span className="text-stone-600">
                      ({(photo.file.size / 1024 / 1024).toFixed(1)}MB)
                    </span>
                  </div>
                )}

                {/* Parsing state */}
                {photo.status === 'parsing' && (
                  <p className="text-sm text-stone-400">Reading recipe from photo...</p>
                )}

                {/* Error state */}
                {photo.status === 'error' && (
                  <div className="space-y-2">
                    <p className="text-sm text-red-400">{photo.error}</p>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setPhotos((prev) =>
                          prev.map((p) =>
                            p.id === photo.id ? { ...p, status: 'queued', error: undefined } : p
                          )
                        )
                      }}
                    >
                      Retry
                    </Button>
                  </div>
                )}

                {/* Parsed / Saved state - show recipe details */}
                {(photo.status === 'parsed' ||
                  photo.status === 'saving' ||
                  photo.status === 'saved') &&
                  photo.recipe && (
                    <div className="space-y-3">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {photo.status === 'parsed' ? (
                            <input
                              type="text"
                              value={photo.recipe.name}
                              onChange={(e) => updateRecipeField(photo.id, 'name', e.target.value)}
                              className="text-lg font-semibold bg-transparent border-b border-stone-700 text-stone-100 w-full focus:border-orange-400 focus:outline-none pb-0.5"
                            />
                          ) : (
                            <h3 className="text-lg font-semibold text-stone-100">
                              {photo.recipe.name}
                            </h3>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge>{photo.recipe.category}</Badge>
                            {photo.confidence && (
                              <Badge
                                variant={
                                  photo.confidence === 'high'
                                    ? 'success'
                                    : photo.confidence === 'medium'
                                      ? 'warning'
                                      : 'error'
                                }
                              >
                                {photo.confidence} confidence
                              </Badge>
                            )}
                            {photo.recipe.yield_description && (
                              <span className="text-xs text-stone-500">
                                {photo.recipe.yield_description}
                              </span>
                            )}
                          </div>
                        </div>
                        {photo.status === 'parsed' && (
                          <Button variant="primary" onClick={() => saveRecipe(photo.id)}>
                            Save
                          </Button>
                        )}
                        {photo.status === 'saved' && photo.savedId && (
                          <a
                            href={`/recipes/${photo.savedId}`}
                            className="text-sm text-orange-400 hover:text-orange-300 whitespace-nowrap"
                          >
                            View Recipe
                          </a>
                        )}
                      </div>

                      {/* Warnings */}
                      {photo.warnings && photo.warnings.length > 0 && (
                        <div className="text-xs text-amber-400 space-y-0.5">
                          {photo.warnings.map((w, i) => (
                            <p key={i}>* {w}</p>
                          ))}
                        </div>
                      )}

                      {/* Expandable details */}
                      <button
                        type="button"
                        onClick={() => setExpandedId(expandedId === photo.id ? null : photo.id)}
                        className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
                      >
                        {expandedId === photo.id ? 'Hide details' : 'Show details'} (
                        {photo.recipe.ingredients.length} ingredients)
                      </button>

                      {expandedId === photo.id && (
                        <div className="space-y-3 border-t border-stone-800 pt-3">
                          {/* Ingredients */}
                          <div>
                            <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1.5">
                              Ingredients
                            </h4>
                            <div className="grid gap-1">
                              {photo.recipe.ingredients.map((ing: ParsedIngredient, i: number) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 text-sm text-stone-300"
                                >
                                  <span className="text-stone-500 w-16 text-right flex-shrink-0">
                                    {ing.quantity} {ing.unit}
                                  </span>
                                  <span>{ing.name}</span>
                                  {ing.preparation_notes && (
                                    <span className="text-stone-600 text-xs">
                                      ({ing.preparation_notes})
                                    </span>
                                  )}
                                  {ing.estimated && (
                                    <span className="text-amber-600 text-xs">est.</span>
                                  )}
                                  {ing.allergen_flags.length > 0 && (
                                    <Badge variant="warning" className="text-[10px] py-0 px-1">
                                      {ing.allergen_flags.join(', ')}
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Method */}
                          <div>
                            <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1.5">
                              Method
                            </h4>
                            {photo.status === 'parsed' ? (
                              <textarea
                                value={photo.recipe.method}
                                onChange={(e) =>
                                  updateRecipeField(photo.id, 'method', e.target.value)
                                }
                                rows={4}
                                className="w-full bg-stone-900/50 border border-stone-700 rounded-lg p-2 text-sm text-stone-300 focus:border-orange-400 focus:outline-none resize-y"
                              />
                            ) : (
                              <p className="text-sm text-stone-300 whitespace-pre-wrap">
                                {photo.recipe.method}
                              </p>
                            )}
                          </div>

                          {/* Tags */}
                          {(photo.recipe.dietary_tags.length > 0 ||
                            photo.recipe.allergen_flags.length > 0) && (
                            <div className="flex flex-wrap gap-1.5">
                              {photo.recipe.dietary_tags.map((tag: string) => (
                                <Badge key={tag} variant="info">
                                  {tag}
                                </Badge>
                              ))}
                              {photo.recipe.allergen_flags.map((flag: string) => (
                                <Badge key={flag} variant="warning">
                                  {flag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Notes / Adaptations */}
                          {photo.recipe.adaptations && (
                            <div>
                              <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
                                Variations / Adaptations
                              </h4>
                              <p className="text-sm text-stone-400">{photo.recipe.adaptations}</p>
                            </div>
                          )}
                          {photo.recipe.notes && (
                            <div>
                              <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
                                Notes
                              </h4>
                              <p className="text-sm text-stone-400">{photo.recipe.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {photos.length === 0 && (
        <div className="text-center py-12 text-stone-500">
          <p className="text-lg mb-1">No recipe photos yet</p>
          <p className="text-sm">
            Photograph your recipe cards, printed pages, or handwritten notes to get started.
          </p>
        </div>
      )}
    </div>
  )
}
