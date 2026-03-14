'use client'

// Event-to-Social Post Composer
// Select event photos, generate or write a caption, pick platforms, and create a social post.

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Check,
  Copy,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  CheckCircle,
} from '@/components/ui/icons'
import {
  createPostFromEvent,
  generateCaption,
  markPostPublished,
  getPostCaptionText,
} from '@/lib/social/event-social-actions'
import type { EventPhoto } from '@/lib/events/photo-actions'
import type { EventSocialPost } from '@/lib/social/event-social-actions'

// ─── Types ──────────────────────────────────────────────────────────────────

type PhotoWithUrl = EventPhoto

type Platform = {
  id: string
  label: string
  color: string
}

const PLATFORMS: Platform[] = [
  { id: 'instagram', label: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  { id: 'facebook', label: 'Facebook', color: 'bg-blue-600' },
  { id: 'tiktok', label: 'TikTok', color: 'bg-stone-800' },
  { id: 'linkedin', label: 'LinkedIn', color: 'bg-blue-700' },
  { id: 'x', label: 'X', color: 'bg-stone-900' },
  { id: 'pinterest', label: 'Pinterest', color: 'bg-red-600' },
]

// ─── Component ──────────────────────────────────────────────────────────────

export function EventPostComposer({
  eventId,
  photos,
  initialCaption,
  existingPosts,
  eventTitle,
}: {
  eventId: string
  photos: PhotoWithUrl[]
  initialCaption?: string
  existingPosts: EventSocialPost[]
  eventTitle: string
}) {
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([])
  const [caption, setCaption] = useState(initialCaption ?? '')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram'])
  const [generating, setGenerating] = useState(false)
  const [aiNote, setAiNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  // ─── Photo selection ────────────────────────────────────────────────────

  function togglePhoto(photoId: string) {
    setSelectedPhotoIds((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]
    )
  }

  function selectAllPhotos() {
    if (selectedPhotoIds.length === photos.length) {
      setSelectedPhotoIds([])
    } else {
      setSelectedPhotoIds(photos.map((p) => p.id))
    }
  }

  // ─── Platform toggle ───────────────────────────────────────────────────

  function togglePlatform(platformId: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId) ? prev.filter((id) => id !== platformId) : [...prev, platformId]
    )
  }

  // ─── Generate caption ──────────────────────────────────────────────────

  async function handleGenerateCaption() {
    setGenerating(true)
    setAiNote(null)
    setError(null)
    try {
      const result = await generateCaption(eventId)
      if (result.success) {
        setCaption(result.caption)
        if (!result.aiGenerated) {
          setAiNote('Ollama is offline. Here is a template you can edit.')
        }
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to generate caption')
    } finally {
      setGenerating(false)
    }
  }

  // ─── Create post ──────────────────────────────────────────────────────

  function handleCreatePost() {
    if (!caption.trim()) {
      setError('Please write a caption first')
      return
    }
    if (selectedPlatforms.length === 0) {
      setError('Select at least one platform')
      return
    }

    setError(null)
    setSuccessMessage(null)

    startTransition(async () => {
      try {
        const result = await createPostFromEvent({
          eventId,
          photoIds: selectedPhotoIds,
          caption: caption.trim(),
          platforms: selectedPlatforms,
        })
        if (result.success) {
          setSuccessMessage('Post created! Find it in your Social Planner.')
          setCaption('')
          setSelectedPhotoIds([])
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError('Something went wrong creating the post')
      }
    })
  }

  // ─── Copy to clipboard ────────────────────────────────────────────────

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(caption)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }

  // ─── Mark existing post as published ──────────────────────────────────

  async function handleMarkPublished(postId: string, platform: string) {
    startTransition(async () => {
      try {
        const result = await markPostPublished(postId, platform)
        if (!result.success) {
          setError(result.error ?? 'Failed to mark as published')
        }
      } catch {
        setError('Failed to mark as published')
      }
    })
  }

  // ─── Copy existing post caption ───────────────────────────────────────

  async function handleCopyExisting(postId: string) {
    try {
      const result = await getPostCaptionText(postId)
      if (result.success) {
        await navigator.clipboard.writeText(result.text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      setError('Failed to copy')
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Event header */}
      <div>
        <h2 className="text-lg font-semibold text-stone-100">{eventTitle}</h2>
        <p className="text-sm text-stone-400">Create a social media post from this event</p>
      </div>

      {/* Existing posts for this event */}
      {existingPosts.length > 0 && (
        <Card className="border-stone-700/60 bg-stone-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-stone-300">
              Existing Posts ({existingPosts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {existingPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-stone-700/40 bg-stone-800/30 p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-200 truncate">
                    {post.caption_master || post.title}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {(post.platforms ?? []).map((p) => {
                      const isPublished = (post.published_to_platforms ?? []).includes(p)
                      return (
                        <Badge
                          key={p}
                          variant={isPublished ? 'success' : 'default'}
                          className="text-xs cursor-pointer"
                          onClick={() => {
                            if (!isPublished) handleMarkPublished(post.id, p)
                          }}
                        >
                          {isPublished && <Check className="w-3 h-3 mr-0.5" />}
                          {p}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyExisting(post.id)}
                  title="Copy caption"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Photo selection */}
      <Card className="border-stone-700/60 bg-stone-900/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-stone-300">
              <ImageIcon className="w-4 h-4 inline mr-1.5" />
              Select Photos ({selectedPhotoIds.length}/{photos.length})
            </CardTitle>
            {photos.length > 0 && (
              <Button variant="ghost" size="sm" onClick={selectAllPhotos}>
                {selectedPhotoIds.length === photos.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <p className="text-sm text-stone-500 py-4 text-center">
              No photos uploaded for this event yet.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {photos.map((photo) => {
                const isSelected = selectedPhotoIds.includes(photo.id)
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => togglePhoto(photo.id)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/30'
                        : 'border-stone-700/40 hover:border-stone-600'
                    }`}
                  >
                    <Image
                      src={photo.signedUrl}
                      alt={photo.caption ?? 'Event photo'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-amber-400" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Caption editor */}
      <Card className="border-stone-700/60 bg-stone-900/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-stone-300">Caption</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerateCaption}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-1.5" />
                )}
                {generating ? 'Generating...' : 'Generate Caption'}
              </Button>
              {caption && (
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <Check className="w-4 h-4 mr-1 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 mr-1" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {aiNote && <p className="text-xs text-amber-400 mb-2">{aiNote}</p>}
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write your caption here, or hit Generate to get a starting point..."
            className="w-full min-h-[120px] rounded-lg border border-stone-700/60 bg-stone-800/50 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-y"
            maxLength={2200}
          />
          <div className="flex justify-between mt-1.5">
            <p className="text-xs text-stone-500">{caption.length}/2200 characters</p>
          </div>
        </CardContent>
      </Card>

      {/* Platform selection */}
      <Card className="border-stone-700/60 bg-stone-900/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-stone-300">Platforms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((platform) => {
              const isSelected = selectedPlatforms.includes(platform.id)
              return (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => togglePlatform(platform.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    isSelected
                      ? `${platform.color} text-white shadow-md`
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                  {platform.label}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {caption && (
        <Card className="border-stone-700/60 bg-stone-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-stone-300">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-stone-700/40 bg-stone-800/30 p-4">
              {/* Photo preview row */}
              {selectedPhotoIds.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                  {selectedPhotoIds.slice(0, 4).map((id) => {
                    const photo = photos.find((p) => p.id === id)
                    if (!photo) return null
                    return (
                      <div
                        key={id}
                        className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden"
                      >
                        <Image
                          src={photo.signedUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                    )
                  })}
                  {selectedPhotoIds.length > 4 && (
                    <div className="w-20 h-20 flex-shrink-0 rounded-md bg-stone-700/50 flex items-center justify-center text-sm text-stone-400">
                      +{selectedPhotoIds.length - 4}
                    </div>
                  )}
                </div>
              )}
              {/* Caption text */}
              <p className="text-sm text-stone-200 whitespace-pre-wrap">{caption}</p>
              {/* Platform badges */}
              <div className="flex gap-1.5 mt-3">
                {selectedPlatforms.map((p) => (
                  <Badge key={p} variant="default" className="text-xs">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error / Success */}
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {successMessage && (
        <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
          <CheckCircle className="w-4 h-4 inline mr-1.5" />
          {successMessage}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleCreatePost}
          disabled={pending || !caption.trim() || selectedPlatforms.length === 0}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Post'
          )}
        </Button>
        {caption && (
          <Button variant="ghost" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-1.5" />
            {copied ? 'Copied!' : 'Copy Caption'}
          </Button>
        )}
      </div>
    </div>
  )
}
