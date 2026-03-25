'use client'

// TourSpotlight - Step-by-step guided tour overlay
// Highlights target elements with a spotlight effect and shows
// contextual tooltips with next/prev/skip controls.

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTour } from './tour-provider'
import { useOverlaySlot } from '@/lib/overlay/overlay-queue'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, X } from '@/components/ui/icons'

type Rect = { top: number; left: number; width: number; height: number }

export function TourSpotlight() {
  const tour = useTour()
  const { visible } = useOverlaySlot('tour-spotlight', 1, tour.isTourActive)
  const router = useRouter()
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const observerRef = useRef<ResizeObserver | null>(null)

  const step = tour.currentTourStep
  const isFirst = tour.currentTourIndex === 0
  const isLast = tour.currentTourIndex === tour.totalSteps - 1

  // Find and measure the target element
  const measureTarget = useCallback(() => {
    if (!step?.target) {
      setTargetRect(null)
      return
    }

    const el = document.querySelector(step.target)
    if (!el) {
      setTargetRect(null)
      return
    }

    const rect = el.getBoundingClientRect()
    const padding = 8
    setTargetRect({
      top: rect.top - padding + window.scrollY,
      left: rect.left - padding + window.scrollX,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    })
  }, [step])

  // Position the tooltip relative to the target (or center if no target)
  useEffect(() => {
    if (!step) return

    if (!targetRect) {
      // No target: center the tooltip
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      })
      return
    }

    const tooltipWidth = 320
    const tooltipGap = 12
    const viewport = { w: window.innerWidth, h: window.innerHeight }

    let top = 0
    let left = 0

    switch (step.placement) {
      case 'bottom':
        top = targetRect.top + targetRect.height + tooltipGap
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
        break
      case 'top':
        top = targetRect.top - tooltipGap - 160 // estimated tooltip height
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
        break
      case 'right':
        top = targetRect.top + targetRect.height / 2 - 80
        left = targetRect.left + targetRect.width + tooltipGap
        break
      case 'left':
        top = targetRect.top + targetRect.height / 2 - 80
        left = targetRect.left - tooltipWidth - tooltipGap
        break
    }

    // Clamp to viewport
    left = Math.max(16, Math.min(left, viewport.w - tooltipWidth - 16))
    top = Math.max(16, top)

    setTooltipStyle({
      position: 'absolute',
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
    })
  }, [targetRect, step])

  // Observe target element for position changes
  useEffect(() => {
    measureTarget()

    const handleScroll = () => measureTarget()
    const handleResize = () => measureTarget()

    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)

    // Watch for DOM changes (target might appear after navigation)
    if (step?.target) {
      const checkInterval = setInterval(() => {
        const el = document.querySelector(step.target!)
        if (el) {
          measureTarget()
          // Use ResizeObserver if available
          if (observerRef.current) observerRef.current.disconnect()
          observerRef.current = new ResizeObserver(measureTarget)
          observerRef.current.observe(el)
          clearInterval(checkInterval)
        }
      }, 200)

      return () => {
        clearInterval(checkInterval)
        window.removeEventListener('scroll', handleScroll, true)
        window.removeEventListener('resize', handleResize)
        observerRef.current?.disconnect()
      }
    }

    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
      observerRef.current?.disconnect()
    }
  }, [step, measureTarget])

  // Navigate to step's route if needed
  useEffect(() => {
    if (step?.route && !window.location.pathname.startsWith(step.route)) {
      router.push(step.route)
    }
  }, [step, router])

  const handleNext = useCallback(() => {
    if (step) tour.completeStep(step.id)
    tour.nextTourStep()
  }, [tour, step])

  const handlePrev = useCallback(() => {
    tour.prevTourStep()
  }, [tour])

  const handleSkip = useCallback(() => {
    tour.stopTour()
  }, [tour])

  if (!tour.isTourActive || !visible || !step) return null

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 z-[90]" aria-hidden="true">
        {/* Semi-transparent overlay with cutout for target */}
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ minHeight: document.documentElement.scrollHeight }}
        >
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left}
                  y={targetRect.top}
                  width={targetRect.width}
                  height={targetRect.height}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.6)"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {/* Spotlight border glow */}
        {targetRect && (
          <div
            className="absolute rounded-lg ring-2 ring-brand-500 ring-offset-2 ring-offset-transparent pointer-events-none"
            style={{
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
            }}
          />
        )}
      </div>

      {/* Tooltip card */}
      <div className="fixed inset-0 z-[91] pointer-events-none">
        <div
          className="pointer-events-auto bg-stone-900 border border-stone-700 rounded-xl shadow-2xl p-4 animate-in fade-in duration-200"
          style={tooltipStyle}
          role="dialog"
          aria-label={step.title}
        >
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-stone-400">
              Step {tour.currentTourIndex + 1} of {tour.totalSteps}
            </span>
            <button
              onClick={handleSkip}
              className="p-1 text-stone-400 hover:text-stone-200 rounded transition-colors"
              aria-label="Close tour"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Content */}
          <h3 className="text-sm font-semibold text-stone-100 mb-1">{step.title}</h3>
          <p className="text-xs text-stone-400 leading-relaxed mb-4">{step.description}</p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={isFirst}
              className="text-xs px-2 py-1 h-auto"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Back
            </Button>

            <div className="flex items-center gap-1">
              {tour.config.steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    i === tour.currentTourIndex
                      ? 'bg-brand-500'
                      : i < tour.currentTourIndex
                        ? 'bg-brand-700'
                        : 'bg-stone-600'
                  }`}
                />
              ))}
            </div>

            <Button variant="primary" onClick={handleNext} className="text-xs px-3 py-1 h-auto">
              {isLast ? 'Finish' : 'Next'}
              {!isLast && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
