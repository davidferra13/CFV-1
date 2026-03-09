/* eslint-disable jsx-a11y/alt-text */
'use client'

// PhotoTagger — Photo grid with AI-suggested tag chips.
// Displays photos with existing tags, lets the chef request tag suggestions
// per photo via suggestPhotoTags(url), then confirm or reject each suggestion
// via confirmPhotoTag(photoId, tags). Tags are displayed as chips below each photo.

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { suggestPhotoTags, confirmPhotoTag } from '@/lib/events/photo-tagging-actions'
import { Image, Bot, Check, X, Tag } from '@/components/ui/icons'

type Photo = {
  id: string
  url: string
  tags?: string[]
}

type Props = {
  photos: Photo[]
}

type PhotoState = {
  confirmedTags: string[]
  suggestedTags: string[]
  rejectedTags: string[]
  loading: boolean
  saving: boolean
  error: string | null
}

export function PhotoTagger({ photos: initialPhotos }: Props) {
  const [photoStates, setPhotoStates] = useState<Record<string, PhotoState>>(() => {
    const initial: Record<string, PhotoState> = {}
    for (const photo of initialPhotos) {
      initial[photo.id] = {
        confirmedTags: photo.tags ?? [],
        suggestedTags: [],
        rejectedTags: [],
        loading: false,
        saving: false,
        error: null,
      }
    }
    return initial
  })
  const [, startTransition] = useTransition()

  if (initialPhotos.length === 0) {
    return (
      <Card className="border-dashed border-stone-600">
        <CardContent className="py-8">
          <div className="text-center">
            <Image className="h-8 w-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-500">No photos to tag</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  function updatePhotoState(photoId: string, updates: Partial<PhotoState>) {
    setPhotoStates((prev) => ({
      ...prev,
      [photoId]: { ...prev[photoId], ...updates },
    }))
  }

  function handleSuggestTags(photo: Photo) {
    updatePhotoState(photo.id, { loading: true, error: null })

    startTransition(async () => {
      try {
        const result = await suggestPhotoTags(photo.url)
        const state = photoStates[photo.id]

        // Filter out tags already confirmed or rejected
        const existing = new Set([...state.confirmedTags, ...state.rejectedTags])
        const newSuggestions = result.suggestedTags.filter((t) => !existing.has(t))

        updatePhotoState(photo.id, {
          suggestedTags: newSuggestions,
          loading: false,
        })
      } catch (err) {
        updatePhotoState(photo.id, {
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to suggest tags',
        })
      }
    })
  }

  function handleAcceptTag(photoId: string, tag: string) {
    setPhotoStates((prev) => {
      const state = prev[photoId]
      return {
        ...prev,
        [photoId]: {
          ...state,
          confirmedTags: [...state.confirmedTags, tag],
          suggestedTags: state.suggestedTags.filter((t) => t !== tag),
        },
      }
    })
  }

  function handleRejectTag(photoId: string, tag: string) {
    setPhotoStates((prev) => {
      const state = prev[photoId]
      return {
        ...prev,
        [photoId]: {
          ...state,
          suggestedTags: state.suggestedTags.filter((t) => t !== tag),
          rejectedTags: [...state.rejectedTags, tag],
        },
      }
    })
  }

  function handleRemoveConfirmedTag(photoId: string, tag: string) {
    setPhotoStates((prev) => {
      const state = prev[photoId]
      return {
        ...prev,
        [photoId]: {
          ...state,
          confirmedTags: state.confirmedTags.filter((t) => t !== tag),
        },
      }
    })
  }

  function handleSaveTags(photoId: string) {
    const state = photoStates[photoId]
    if (state.confirmedTags.length === 0) return

    updatePhotoState(photoId, { saving: true, error: null })

    startTransition(async () => {
      try {
        await confirmPhotoTag(photoId, state.confirmedTags)
        updatePhotoState(photoId, { saving: false })
      } catch (err) {
        updatePhotoState(photoId, {
          saving: false,
          error: err instanceof Error ? err.message : 'Failed to save tags',
        })
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-stone-400" />
          Photo Tags
        </CardTitle>
        <p className="text-xs text-stone-500 -mt-1">
          Suggest tags for each photo, then confirm or reject the results.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {initialPhotos.map((photo) => {
            const state = photoStates[photo.id]
            if (!state) return null

            const hasUnsavedChanges =
              JSON.stringify(state.confirmedTags.sort()) !==
              JSON.stringify((photo.tags ?? []).sort())

            return (
              <div
                key={photo.id}
                className="rounded-lg border border-stone-700 bg-stone-900 overflow-hidden"
              >
                {/* Photo */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt="Event photo"
                  className="w-full h-40 object-cover bg-stone-800"
                />

                <div className="p-3 space-y-2">
                  {/* Confirmed tags */}
                  {state.confirmedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {state.confirmedTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-700 ring-1 ring-inset ring-emerald-800"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveConfirmedTag(photo.id, tag)}
                            className="text-emerald-400 hover:text-emerald-600 ml-0.5"
                            aria-label={`Remove tag ${tag}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Suggested tags (pending accept/reject) */}
                  {state.suggestedTags.length > 0 && (
                    <div>
                      <p className="text-xs text-stone-400 mb-1">Suggestions:</p>
                      <div className="flex flex-wrap gap-1">
                        {state.suggestedTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-950 text-amber-700 ring-1 ring-inset ring-amber-800"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleAcceptTag(photo.id, tag)}
                              className="text-emerald-500 hover:text-emerald-700"
                              aria-label={`Accept tag ${tag}`}
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectTag(photo.id, tag)}
                              className="text-red-400 hover:text-red-600"
                              aria-label={`Reject tag ${tag}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {state.error && <p className="text-xs text-red-600">{state.error}</p>}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSuggestTags(photo)}
                      disabled={state.loading}
                      loading={state.loading}
                    >
                      <Bot className="h-3.5 w-3.5" />
                      {state.loading ? 'Analyzing...' : 'Suggest Tags'}
                    </Button>
                    {hasUnsavedChanges && state.confirmedTags.length > 0 && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSaveTags(photo.id)}
                        disabled={state.saving}
                        loading={state.saving}
                      >
                        {state.saving ? 'Saving...' : 'Save Tags'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
