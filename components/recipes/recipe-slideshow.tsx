/* eslint-disable @next/next/no-img-element */
'use client'

import { useCallback, useEffect, useState } from 'react'

type SlideshowPhoto = {
  id: string
  photo_url: string
  caption: string | null
}

type SlideshowStep = {
  number: number
  instruction: string
  photos: SlideshowPhoto[]
}

type Props = {
  recipeName: string
  steps: SlideshowStep[]
}

export function RecipeSlideshow({ recipeName, steps }: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const [currentPhoto, setCurrentPhoto] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)

  const step = steps[currentStep]
  const photo = step?.photos[currentPhoto]
  const totalSteps = steps.length

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalSteps) {
        setCurrentStep(index)
        setCurrentPhoto(0)
      }
    },
    [totalSteps]
  )

  const nextPhoto = useCallback(() => {
    if (!step) return
    if (currentPhoto < step.photos.length - 1) {
      setCurrentPhoto(currentPhoto + 1)
    } else if (currentStep < totalSteps - 1) {
      // Advance to next step
      setCurrentStep(currentStep + 1)
      setCurrentPhoto(0)
    }
  }, [step, currentPhoto, currentStep, totalSteps])

  const prevPhoto = useCallback(() => {
    if (currentPhoto > 0) {
      setCurrentPhoto(currentPhoto - 1)
    } else if (currentStep > 0) {
      // Go back to previous step's last photo
      const prevStep = steps[currentStep - 1]
      setCurrentStep(currentStep - 1)
      setCurrentPhoto(Math.max(0, (prevStep?.photos.length ?? 1) - 1))
    }
  }, [currentPhoto, currentStep, steps])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setFullscreen(false)
    }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault()
          nextPhoto()
          break
        case 'ArrowLeft':
          e.preventDefault()
          prevPhoto()
          break
        case 'ArrowUp':
          e.preventDefault()
          goToStep(currentStep - 1)
          break
        case 'ArrowDown':
          e.preventDefault()
          goToStep(currentStep + 1)
          break
        case 'f':
          toggleFullscreen()
          break
        case 'Escape':
          if (fullscreen) {
            document.exitFullscreen().catch(() => {})
            setFullscreen(false)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [nextPhoto, prevPhoto, goToStep, currentStep, toggleFullscreen, fullscreen])

  // Listen for fullscreen changes from browser
  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  if (steps.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-gray-50">
        <p className="text-gray-400">No steps with photos to display.</p>
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col ${
        fullscreen ? 'fixed inset-0 z-50 bg-gray-900' : 'rounded-lg border bg-gray-900'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{recipeName}</h2>
          <p className="text-sm text-gray-400">
            Step {step?.number ?? currentStep + 1} of {totalSteps}
            {step && step.photos.length > 1 && (
              <span className="ml-2">
                (Photo {currentPhoto + 1}/{step.photos.length})
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="rounded-md border border-gray-600 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800"
        >
          {fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Step list sidebar */}
        <div className="hidden w-48 flex-shrink-0 overflow-y-auto border-r border-gray-700 md:block">
          {steps.map((s, index) => (
            <button
              key={s.number}
              type="button"
              onClick={() => goToStep(index)}
              className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                index === currentStep
                  ? 'bg-orange-600/20 text-orange-400 border-l-2 border-orange-500'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <span className="font-medium">Step {s.number}</span>
              {s.photos.length > 0 && (
                <span className="ml-1 text-xs opacity-60">({s.photos.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Photo + instruction area */}
        <div className="flex flex-1 flex-col">
          {/* Photo display */}
          <div className="relative flex flex-1 items-center justify-center bg-black p-4">
            {photo ? (
              <img
                src={photo.photo_url}
                alt={photo.caption || `Step ${step?.number} photo`}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="flex h-48 items-center justify-center">
                <p className="text-gray-500">No photos for this step</p>
              </div>
            )}

            {/* Navigation arrows */}
            <button
              type="button"
              onClick={prevPhoto}
              disabled={currentStep === 0 && currentPhoto === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white hover:bg-black/80 disabled:opacity-20"
              aria-label="Previous"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={nextPhoto}
              disabled={
                currentStep === totalSteps - 1 && currentPhoto === (step?.photos.length ?? 1) - 1
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white hover:bg-black/80 disabled:opacity-20"
              aria-label="Next"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Caption + Instruction bar */}
          <div className="border-t border-gray-700 px-4 py-3">
            {photo?.caption && (
              <p className="mb-1 text-sm font-medium text-orange-400">{photo.caption}</p>
            )}
            {step?.instruction && (
              <p className="text-sm text-gray-300 leading-relaxed">{step.instruction}</p>
            )}
          </div>

          {/* Photo dots for multi-photo steps */}
          {step && step.photos.length > 1 && (
            <div className="flex justify-center gap-1.5 border-t border-gray-700 py-2">
              {step.photos.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentPhoto(index)}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    index === currentPhoto ? 'bg-orange-500' : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                  aria-label={`Photo ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="border-t border-gray-700 px-4 py-1.5 text-center text-xs text-gray-500">
        Arrow keys to navigate, Space for next, F for fullscreen
      </div>
    </div>
  )
}
