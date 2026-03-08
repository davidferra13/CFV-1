'use client'

// WelcomeModal - Role-specific first-login welcome screen
// Shows once per user, then never again. Introduces the app and offers
// to start the guided tour or skip to exploring on their own.
//
// Uses createPortal to render at document.body level, escaping CSS
// transform containing blocks that break position:fixed.

import { useCallback, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTour } from './tour-provider'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from '@/components/ui/icons'

export function WelcomeModal() {
  const tour = useTour()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleStartTour = useCallback(() => {
    tour.markWelcomeSeen()
    tour.startTour()
  }, [tour])

  const handleSkip = useCallback(() => {
    tour.markWelcomeSeen()
  }, [tour])

  if (!tour.showWelcome || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
      >
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 px-8 py-10 text-center">
          <h2 id="welcome-title" className="text-2xl font-bold text-white">
            {tour.config.welcomeTitle}
          </h2>
          <p className="mt-2 text-brand-100 text-sm">{tour.config.welcomeSubtitle}</p>
        </div>

        {/* Feature points */}
        <div className="px-8 py-6 space-y-3">
          {tour.config.welcomePoints.map((point, i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-brand-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-stone-300">{point}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={handleSkip} className="order-2 sm:order-1">
            Skip for now
          </Button>
          <Button variant="primary" onClick={handleStartTour} className="order-1 sm:order-2">
            Show Me Around
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
