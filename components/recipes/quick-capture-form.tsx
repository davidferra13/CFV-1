'use client'

// QuickCaptureForm - minimal-friction recipe capture
// Two modes: Photo (snap/upload + name) and Voice (record + transcribe later)
// Saves draft recipes that can be fleshed out in the full editor.

import { useState, useRef, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { VoiceRecorder } from '@/components/recipes/voice-recorder'
import { createQuickRecipe, uploadQuickCapturePhoto } from '@/lib/recipes/quick-capture-actions'
import type { QuickCaptureInput } from '@/lib/recipes/quick-capture-actions'

type CaptureMode = 'photo' | 'voice'

const ACCEPT = 'image/jpeg,image/png,image/heic,image/heif,image/webp'

export function QuickCaptureForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [mode, setMode] = useState<CaptureMode>('photo')
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [transcript, setTranscript] = useState('')
  const [saved, setSaved] = useState(false)
  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null)

  // Photo handling
  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const url = URL.createObjectURL(file)
    setPhotoPreview(url)
  }, [])

  const clearPhoto = useCallback(() => {
    setPhotoFile(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [photoPreview])

  // Voice handling
  const handleRecordingComplete = useCallback((blob: Blob) => {
    setAudioBlob(blob)
    toast.success('Recording saved')
  }, [])

  // Save
  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Give your recipe a name')
      return
    }

    startTransition(async () => {
      try {
        const input: QuickCaptureInput = {
          name: name.trim(),
          notes: notes.trim() || undefined,
          captureSource: mode,
          transcript: transcript.trim() || undefined,
          category: 'other',
        }

        const result = await createQuickRecipe(input)
        if (!result.success) {
          toast.error(result.error)
          return
        }

        const recipeId = result.recipeId

        // Upload photo if present
        if (photoFile && recipeId) {
          const formData = new FormData()
          formData.append('photo', photoFile)
          const photoResult = await uploadQuickCapturePhoto(recipeId, formData)
          if (!photoResult.success) {
            toast.error(`Recipe saved, but photo upload failed: ${photoResult.error}`)
          }
        }

        setSaved(true)
        setSavedRecipeId(recipeId)
        toast.success('Recipe captured!')
      } catch {
        toast.error('Something went wrong. Please try again.')
      }
    })
  }

  // After save: offer next actions
  if (saved && savedRecipeId) {
    return (
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <div className="rounded-2xl border border-green-800 bg-green-950/30 p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-900/50">
            <svg
              className="h-8 w-8 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-stone-100">Recipe Captured</h2>
          <p className="mt-2 text-stone-400">Saved as a draft. You can flesh it out anytime.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => router.push(`/recipes/${savedRecipeId}`)}
              className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition-colors hover:bg-brand-500"
            >
              Open Recipe
            </button>
            <button
              type="button"
              onClick={() => {
                setSaved(false)
                setSavedRecipeId(null)
                setName('')
                setNotes('')
                setTranscript('')
                clearPhoto()
                setAudioBlob(null)
              }}
              className="rounded-lg border border-stone-600 px-4 py-2 font-medium text-stone-300 transition-colors hover:bg-stone-800"
            >
              Capture Another
            </button>
            <button
              type="button"
              onClick={() => router.push('/recipes')}
              className="rounded-lg border border-stone-600 px-4 py-2 font-medium text-stone-300 transition-colors hover:bg-stone-800"
            >
              Back to Recipes
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Mode toggle */}
      <div className="flex rounded-lg border border-stone-700 bg-stone-900/50 p-1">
        <button
          type="button"
          onClick={() => setMode('photo')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'photo' ? 'bg-stone-700 text-stone-100' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Photo
        </button>
        <button
          type="button"
          onClick={() => setMode('voice')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'voice' ? 'bg-stone-700 text-stone-100' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Voice
        </button>
      </div>

      {/* Photo mode */}
      {mode === 'photo' && (
        <div className="space-y-4">
          {photoPreview ? (
            <div className="relative overflow-hidden rounded-xl border border-stone-700">
              <Image
                src={photoPreview}
                alt="Recipe photo preview"
                width={600}
                height={400}
                className="w-full object-cover"
                style={{ maxHeight: '300px' }}
              />
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
                aria-label="Remove photo"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-stone-700 bg-stone-900/30 p-8 text-stone-400 transition-colors hover:border-stone-500 hover:text-stone-300"
            >
              <svg
                className="h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.04l-.821 1.316z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                />
              </svg>
              <span className="text-sm font-medium">Take Photo or Upload</span>
              <span className="text-xs text-stone-500">JPEG, PNG, HEIC, WebP up to 10 MB</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            capture="environment"
            onChange={handlePhotoSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Voice mode */}
      {mode === 'voice' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-stone-700 bg-stone-900/30 p-4">
            <p className="mb-4 text-sm text-stone-400">
              Talk through your recipe. Describe the dish, key ingredients, rough steps. The
              recording is saved with your draft for later reference.
            </p>
            <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
            {audioBlob && (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-400">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Recording saved ({(audioBlob.size / 1024).toFixed(0)} KB)
              </div>
            )}
          </div>

          <div>
            <label htmlFor="transcript" className="mb-1 block text-sm font-medium text-stone-300">
              Notes / Quick Transcript
            </label>
            <textarea
              id="transcript"
              rows={4}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Jot down key points while they're fresh..."
              className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:text-sm"
            />
          </div>
        </div>
      )}

      {/* Common fields */}
      <div>
        <label htmlFor="recipe-name" className="mb-1 block text-sm font-medium text-stone-300">
          Recipe Name <span className="text-red-400">*</span>
        </label>
        <input
          id="recipe-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What are you making?"
          autoComplete="off"
          style={{ fontSize: '16px' }}
          className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:text-sm sm:leading-6"
        />
      </div>

      <div>
        <label htmlFor="recipe-notes" className="mb-1 block text-sm font-medium text-stone-300">
          Quick Notes
        </label>
        <textarea
          id="recipe-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Key ingredients, techniques, inspiration..."
          className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:text-sm"
        />
      </div>

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending || !name.trim()}
        className="w-full rounded-lg bg-brand-600 px-4 py-3 font-medium text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Saving...' : 'Quick Save'}
      </button>

      <p className="text-center text-xs text-stone-500">
        Saved as a draft. Add ingredients, steps, and details anytime.
      </p>
    </div>
  )
}
