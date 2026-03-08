'use client'

// TourSpotlight - Interactive guided tour with spotlight, animated cursor,
// and step-by-step walkthrough. Navigates to pages, highlights real UI
// elements, and shows an animated cursor pointing at what to click.

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTour } from './tour-provider'
import { TourCursor } from './tour-cursor'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, X } from '@/components/ui/icons'

type Rect = { top: number; left: number; width: number; height: number }

export function TourSpotlight() {
  const tour = useTour()
  const router = useRouter()
  const pathname = usePathname()
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const [isNavigating, setIsNavigating] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const observerRef = useRef<ResizeObserver | null>(null)
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    const padding = 10

    // Scroll the element into view if needed
    const isInView = rect.top >= 0 && rect.bottom <= window.innerHeight
    if (!isInView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Re-measure after scroll
      requestAnimationFrame(() => {
        const newRect = el.getBoundingClientRect()
        setTargetRect({
          top: newRect.top - padding,
          left: newRect.left - padding,
          width: newRect.width + padding * 2,
          height: newRect.height + padding * 2,
        })
      })
      return
    }

    setTargetRect({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    })
  }, [step])

  // Position the tooltip relative to the target
  useEffect(() => {
    if (!step || isNavigating) return

    if (!targetRect) {
      // No target found yet or step has no target: show tooltip centered but offset down
      setTooltipStyle({
        position: 'fixed',
        top: '40%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '340px',
      })
      setShowContent(true)
      return
    }

    const tooltipWidth = 340
    const tooltipHeight = 180
    const gap = 16
    const vw = window.innerWidth
    const vh = window.innerHeight

    let top = 0
    let left = 0

    // Smart placement: try placement preference, fall back if no room
    const placements = [step.placement, 'bottom', 'right', 'top', 'left']
    for (const placement of placements) {
      let fits = false
      switch (placement) {
        case 'bottom':
          top = targetRect.top + targetRect.height + gap
          left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
          fits = top + tooltipHeight < vh
          break
        case 'top':
          top = targetRect.top - gap - tooltipHeight
          left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
          fits = top > 0
          break
        case 'right':
          top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
          left = targetRect.left + targetRect.width + gap
          fits = left + tooltipWidth < vw
          break
        case 'left':
          top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
          left = targetRect.left - tooltipWidth - gap
          fits = left > 0
          break
      }
      if (fits) break
    }

    // Clamp to viewport
    left = Math.max(16, Math.min(left, vw - tooltipWidth - 16))
    top = Math.max(16, Math.min(top, vh - tooltipHeight - 16))

    setTooltipStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
    })

    // Small delay so cursor arrives before content appears
    setShowContent(false)
    const timer = setTimeout(() => setShowContent(true), 400)
    return () => clearTimeout(timer)
  }, [targetRect, step, isNavigating])

  // Watch for target element to appear (after navigation)
  useEffect(() => {
    if (!step) return

    // Clear previous watchers
    if (checkIntervalRef.current) clearInterval(checkIntervalRef.current)
    if (observerRef.current) observerRef.current.disconnect()

    measureTarget()

    const handleScroll = () => measureTarget()
    const handleResize = () => measureTarget()
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)

    // Poll for target element (it might appear after navigation/render)
    if (step.target) {
      checkIntervalRef.current = setInterval(() => {
        const el = document.querySelector(step.target!)
        if (el) {
          measureTarget()
          if (observerRef.current) observerRef.current.disconnect()
          observerRef.current = new ResizeObserver(measureTarget)
          observerRef.current.observe(el)
          if (checkIntervalRef.current) clearInterval(checkIntervalRef.current)
        }
      }, 150)
    }

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
      observerRef.current?.disconnect()
    }
  }, [step, measureTarget])

  // Navigate to step's route if needed
  useEffect(() => {
    if (!step?.route) {
      setIsNavigating(false)
      return
    }

    if (!pathname.startsWith(step.route)) {
      setIsNavigating(true)
      setShowContent(false)
      setTargetRect(null)
      router.push(step.route)

      // Give the page time to load before looking for elements
      const timer = setTimeout(() => setIsNavigating(false), 600)
      return () => clearTimeout(timer)
    } else {
      setIsNavigating(false)
    }
  }, [step, router, pathname])

  const handleNext = useCallback(() => {
    if (step) tour.completeStep(step.id)
    tour.nextTourStep()
    setShowContent(false)
    setTargetRect(null)
  }, [tour, step])

  const handlePrev = useCallback(() => {
    tour.prevTourStep()
    setShowContent(false)
    setTargetRect(null)
  }, [tour])

  const handleSkip = useCallback(() => {
    tour.stopTour()
  }, [tour])

  if (!tour.isTourActive || !step) return null

  return (
    <>
      {/* Backdrop overlay - lighter than before so users can see the page */}
      <div className="fixed inset-0 z-[90]" aria-hidden="true">
        <svg className="fixed inset-0 w-full h-full">
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left}
                  y={targetRect.top}
                  width={targetRect.width}
                  height={targetRect.height}
                  rx="12"
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
            fill="rgba(0,0,0,0.45)"
            mask="url(#tour-spotlight-mask)"
          />
        </svg>

        {/* Pulsing border around target */}
        {targetRect && (
          <div
            className="fixed rounded-xl animate-tour-target-pulse pointer-events-none"
            style={{
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
              border: '2px solid rgba(232, 143, 71, 0.7)',
            }}
          />
        )}

        {/* Click-through hole: let users interact with highlighted element */}
        {targetRect && (
          <div
            className="fixed z-[91] cursor-pointer"
            style={{
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
              // This div has no background, so clicks pass through to the element behind
            }}
            onClick={(e) => {
              // Let the click go through to the actual element
              e.stopPropagation()
              const el = step.target ? document.querySelector(step.target) : null
              if (el && el instanceof HTMLElement) {
                el.click()
              }
            }}
          />
        )}
      </div>

      {/* Animated cursor pointing at the target */}
      <TourCursor targetRect={targetRect} isActive={!isNavigating && !!targetRect} />

      {/* Tooltip card */}
      <div className="fixed inset-0 z-[92] pointer-events-none">
        <div
          className={`pointer-events-auto bg-stone-900/95 backdrop-blur-sm border border-stone-600 rounded-xl shadow-2xl p-5 transition-all duration-300 ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
          style={tooltipStyle}
          role="dialog"
          aria-label={step.title}
        >
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
                Step {tour.currentTourIndex + 1} of {tour.totalSteps}
              </span>
              {isNavigating && (
                <span className="text-[10px] text-stone-500 italic">navigating...</span>
              )}
            </div>
            <button
              onClick={handleSkip}
              className="p-1 text-stone-500 hover:text-stone-200 rounded transition-colors"
              aria-label="Close tour"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Content */}
          <h3 className="text-sm font-semibold text-stone-100 mb-1.5">{step.title}</h3>
          <p className="text-xs text-stone-400 leading-relaxed mb-4">{step.description}</p>

          {/* Action hint */}
          {targetRect && step.target && (
            <p className="text-[10px] text-brand-400/80 mb-3 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              Click the highlighted area to try it, or press Next to continue
            </p>
          )}

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
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === tour.currentTourIndex
                      ? 'bg-brand-500 w-4'
                      : i < tour.currentTourIndex
                        ? 'bg-brand-700 w-1.5'
                        : 'bg-stone-600 w-1.5'
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
