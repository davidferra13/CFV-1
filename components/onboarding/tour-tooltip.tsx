'use client'

// TourTooltip - Contextual tooltip that attaches to any element
// Used on individual pages to highlight specific features.
// Only shows if the associated tour step hasn't been completed yet.

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useTourOptional } from './tour-provider'
import { X } from '@/components/ui/icons'

type TourTooltipProps = {
  stepId: string
  title: string
  description: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  children: ReactNode
  // Show even without the tour provider (standalone mode)
  forceShow?: boolean
}

export function TourTooltip({
  stepId,
  title,
  description,
  placement = 'bottom',
  children,
  forceShow = false,
}: TourTooltipProps) {
  const tour = useTourOptional()
  const [dismissed, setDismissed] = useState(false)
  const [visible, setVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Determine if we should show
  const isCompleted = tour?.completedSteps.has(stepId) ?? false
  const shouldShow = !isCompleted && !dismissed && (forceShow || !!tour)

  // Delay showing for 1s after mount to avoid flash
  useEffect(() => {
    if (!shouldShow) return
    const timer = setTimeout(() => setVisible(true), 1000)
    return () => clearTimeout(timer)
  }, [shouldShow])

  const handleDismiss = () => {
    setDismissed(true)
    setVisible(false)
    if (tour) tour.completeStep(stepId)
  }

  const placementClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-stone-700',
    bottom:
      'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-stone-700',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-stone-700',
    right:
      'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-stone-700',
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      {children}
      {visible && shouldShow && (
        <div
          className={`absolute z-50 ${placementClasses[placement]} animate-in fade-in slide-in-from-bottom-1 duration-200`}
        >
          <div className="bg-stone-800 border border-stone-700 rounded-lg shadow-xl p-3 w-56">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="text-xs font-semibold text-stone-200">{title}</h4>
              <button
                onClick={handleDismiss}
                className="p-0.5 text-stone-400 hover:text-stone-200 rounded flex-shrink-0"
                aria-label="Dismiss tip"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">{description}</p>
          </div>
          {/* Arrow */}
          <div
            className={`absolute w-0 h-0 border-[6px] ${arrowClasses[placement]}`}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  )
}
