'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { parseRecipeFromImage } from '@/lib/ai/parse-recipe-vision'
import { saveVisionParsedRecipe } from '@/lib/recipes/photo-import-actions'
import type { ParsedRecipe } from '@/lib/ai/parse-recipe-schema'

type Props = {
  open: boolean
  onClose: () => void
}

type PhotoFile = {
  id: string
  file: File
  preview: string
  status: 'pending' | 'parsing' | 'parsed' | 'saving' | 'saved' | 'error'
  error?: string
  parsed?: ParsedRecipe
  confidence?: 'high' | 'medium' | 'low'
  warnings?: string[]
  recipeId?: string
  ingredientCount?: number
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic']
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB per image

function getMediaType(file: File): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic' {
  if (file.type === 'image/png') return 'image/png'
  if (file.type === 'image/webp') return 'image/webp'
  if (file.type === 'image/heic') return 'image/heic'
  return 'image/jpeg'
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip data URL prefix to get raw base64
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function RecipePhotoBatchImport({ open, onClose }: Props) {
  const router = useRouter()
  const [photos, setPhotos] = useState<PhotoFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [phase, setPhase] = useState<'upload' | 'processing' | 'review' | 'saving' | 'done'>(
    'upload'
  )
  const [isRunning, setIsRunning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const handleClose = () => {
    if (isRunning) return
    // Cleanup preview URLs
    photos.forEach((p) => URL.revokeObjectURL(p.preview))
    setPhotos([])
    setPhase('upload')
    onClose()
  }

  const handleFiles = (fileList: FileList) => {
    const newPhotos: PhotoFile[] = Array.from(fileList)
      .filter((f) => {
        const ext = '.' + f.name.split('.').pop()?.toLowerCase()
        return ACCEPTED_EXTENSIONS.includes(ext) && f.size <= MAX_FILE_SIZE
      })
      .map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        preview: URL.createObjectURL(f),
        status: 'pending' as const,
      }))

    setPhotos((prev) => [...prev, ...newPhotos])
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [])

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id)
      if (photo) URL.revokeObjectURL(photo.preview)
      return prev.filter((p) => p.id !== id)
    })
  }

  // Parse all photos through vision AI
  const handleParseAll = async () => {
    setIsRunning(true)
    setPhase('processing')

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      if (photo.status !== 'pending') continue

      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, status: 'parsing' } : p)))

      try {
        const base64 = await fileToBase64(photo.file)
        const mediaType = getMediaType(photo.file)
        const result = await parseRecipeFromImage(base64, mediaType)

        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id
              ? {
                  ...p,
                  status: 'parsed',
                  parsed: result.parsed,
                  confidence: result.confidence,
                  warnings: result.warnings,
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

    setIsRunning(false)
    setPhase('review')
  }

  // Save all successfully parsed recipes
  const handleSaveAll = async () => {
    const toSave = photos.filter((p) => p.status === 'parsed' && p.parsed)
    if (toSave.length === 0) return

    setIsRunning(true)
    setPhase('saving')

    for (const photo of toSave) {
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, status: 'saving' } : p)))

      try {
        const result = await saveVisionParsedRecipe(photo.parsed!, `Source: ${photo.file.name}`)
        if (result.success) {
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === photo.id
                ? {
                    ...p,
                    status: 'saved',
                    recipeId: result.recipeId,
                    ingredientCount: result.ingredientCount,
                  }
                : p
            )
          )
        } else {
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === photo.id ? { ...p, status: 'error', error: result.error } : p
            )
          )
        }
      } catch (err) {
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id ? { ...p, status: 'error', error: 'Failed to save recipe' } : p
          )
        )
      }
    }

    setIsRunning(false)
    setPhase('done')
    router.refresh()
  }

  // Remove a parsed recipe from the save queue (chef doesn't want it)
  const skipRecipe = (id: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'error', error: 'Skipped by chef' } : p))
    )
  }

  const pendingCount = photos.filter((p) => p.status === 'pending').length
  const parsingCount = photos.filter((p) => p.status === 'parsing').length
  const parsedCount = photos.filter((p) => p.status === 'parsed').length
  const savedCount = photos.filter((p) => p.status === 'saved').length
  const errorCount = photos.filter((p) => p.status === 'error').length
  const totalProcessed = parsedCount + savedCount + errorCount

  const confidenceColor = (c?: string) => {
    if (c === 'high') return 'success'
    if (c === 'medium') return 'warning'
    return 'error'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Batch Photo Import</h2>
            <p className="text-sm text-stone-500">
              {phase === 'upload' && 'Drop recipe photos, cookbook pages, or handwritten cards'}
              {phase === 'processing' &&
                `Parsing ${parsingCount > 0 ? parsingCount : '...'} of ${photos.length} photos`}
              {phase === 'review' && `${parsedCount} recipes extracted. Review and save.`}
              {phase === 'saving' && 'Saving recipes to your book...'}
              {phase === 'done' && `${savedCount} recipes imported successfully`}
            </p>
          </div>
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
          {/* Upload Phase */}
          {phase === 'upload' && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragOver(true)
                }}
                onDragLeave={() => setIsDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  isDragOver
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                }`}
              >
                <div className="text-4xl mb-3 opacity-40">
                  {isDragOver ? '\u2193' : '\uD83D\uDCF7'}
                </div>
                <p className="text-stone-700 font-medium mb-1">
                  {isDragOver ? 'Drop photos here' : 'Drop recipe photos here or click to browse'}
                </p>
                <p className="text-stone-400 text-sm">JPG, PNG, WebP, HEIC (max 20MB per image)</p>
                <p className="text-stone-400 text-xs mt-2">
                  Recipe cards, cookbook pages, handwritten notes, screenshots
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED_EXTENSIONS.join(',')}
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                  className="hidden"
                />
              </div>

              {/* Photo grid preview */}
              {photos.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-stone-600 font-medium">
                      {photos.length} photo{photos.length !== 1 ? 's' : ''} ready
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        photos.forEach((p) => URL.revokeObjectURL(p.preview))
                        setPhotos([])
                      }}
                    >
                      Clear All
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative group aspect-square rounded-lg overflow-hidden border border-stone-200"
                      >
                        <img
                          src={photo.preview}
                          alt={photo.file.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removePhoto(photo.id)
                          }}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          &times;
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                          <p className="text-[10px] text-white truncate">{photo.file.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Processing Phase */}
          {phase === 'processing' && (
            <div className="space-y-3">
              <div className="mb-4">
                <div className="flex justify-between text-sm text-stone-600 mb-1">
                  <span>Parsing photos with vision AI...</span>
                  <span>
                    {totalProcessed} of {photos.length}
                  </span>
                </div>
                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${(totalProcessed / photos.length) * 100}%` }}
                  />
                </div>
              </div>
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="flex items-center gap-3 p-2 rounded-lg border border-stone-100"
                >
                  <img
                    src={photo.preview}
                    alt=""
                    className="w-12 h-12 rounded object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-700 truncate">{photo.file.name}</p>
                    {photo.status === 'parsing' && (
                      <p className="text-xs text-amber-600">Extracting recipe...</p>
                    )}
                    {photo.status === 'parsed' && photo.parsed && (
                      <p className="text-xs text-green-600">Found: {photo.parsed.name}</p>
                    )}
                    {photo.status === 'error' && (
                      <p className="text-xs text-red-500">{photo.error}</p>
                    )}
                    {photo.status === 'pending' && (
                      <p className="text-xs text-stone-400">Waiting...</p>
                    )}
                  </div>
                  {photo.status === 'parsing' && (
                    <svg
                      className="animate-spin h-5 w-5 text-amber-500 shrink-0"
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
                  {photo.status === 'parsed' && (
                    <svg
                      className="h-5 w-5 text-green-500 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {photo.status === 'error' && (
                    <svg
                      className="h-5 w-5 text-red-400 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Review Phase */}
          {(phase === 'review' || phase === 'saving' || phase === 'done') && (
            <div className="space-y-3">
              {phase === 'done' && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 mb-4">
                  <p className="text-sm font-medium text-green-800">
                    Import complete: {savedCount} recipes saved to your book
                    {errorCount > 0 ? `, ${errorCount} skipped or failed` : ''}
                  </p>
                </div>
              )}

              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className={`flex gap-3 p-3 rounded-lg border ${
                    photo.status === 'saved'
                      ? 'border-green-200 bg-green-50/50'
                      : photo.status === 'error'
                        ? 'border-red-200 bg-red-50/30'
                        : photo.status === 'saving'
                          ? 'border-amber-200 bg-amber-50/30'
                          : 'border-stone-200 bg-white'
                  }`}
                >
                  <img
                    src={photo.preview}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    {photo.parsed ? (
                      <>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-stone-900 truncate">
                            {photo.parsed.name}
                          </p>
                          <Badge
                            variant={confidenceColor(photo.confidence) as any}
                            className="shrink-0 text-[10px]"
                          >
                            {photo.confidence}
                          </Badge>
                        </div>
                        <p className="text-xs text-stone-500">
                          {photo.parsed.category} · {photo.parsed.ingredients.length} ingredients
                          {photo.parsed.prep_time_minutes
                            ? ` · ${photo.parsed.prep_time_minutes}m prep`
                            : ''}
                          {photo.parsed.cook_time_minutes
                            ? ` · ${photo.parsed.cook_time_minutes}m cook`
                            : ''}
                        </p>
                        {photo.parsed.dietary_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {photo.parsed.dietary_tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {photo.warnings && photo.warnings.length > 0 && (
                          <p className="text-[10px] text-amber-600 mt-1">
                            {photo.warnings.join('; ')}
                          </p>
                        )}
                        {photo.status === 'saved' && (
                          <p className="text-xs text-green-600 mt-1">
                            Saved with {photo.ingredientCount} ingredient
                            {photo.ingredientCount !== 1 ? 's' : ''}
                          </p>
                        )}
                        {photo.status === 'saving' && (
                          <p className="text-xs text-amber-600 mt-1">Saving...</p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-stone-500">{photo.file.name}</p>
                        <p className="text-xs text-red-500">
                          {photo.error || 'Failed to extract recipe'}
                        </p>
                      </>
                    )}
                  </div>
                  {/* Skip button (review phase only, only for parsed recipes) */}
                  {phase === 'review' && photo.status === 'parsed' && (
                    <button
                      onClick={() => skipRecipe(photo.id)}
                      className="text-stone-400 hover:text-red-500 text-xs shrink-0 self-start mt-1"
                      title="Skip this recipe"
                    >
                      Skip
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100 flex justify-between items-center shrink-0">
          <div className="text-sm text-stone-500">
            {phase === 'upload' && photos.length > 0 && (
              <span>
                {photos.length} photo{photos.length !== 1 ? 's' : ''} selected
              </span>
            )}
            {phase === 'review' && (
              <span>
                {parsedCount} recipe{parsedCount !== 1 ? 's' : ''} ready to save
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {phase === 'upload' && (
              <>
                <Button variant="secondary" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleParseAll} disabled={photos.length === 0}>
                  Parse {photos.length} Photo{photos.length !== 1 ? 's' : ''}
                </Button>
              </>
            )}
            {phase === 'review' && (
              <>
                <Button variant="secondary" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleSaveAll} disabled={parsedCount === 0}>
                  Save {parsedCount} Recipe{parsedCount !== 1 ? 's' : ''} to Book
                </Button>
              </>
            )}
            {phase === 'done' && <Button onClick={handleClose}>Done</Button>}
          </div>
        </div>
      </div>
    </div>
  )
}
