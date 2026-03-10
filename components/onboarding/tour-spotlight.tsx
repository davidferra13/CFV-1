'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, X } from '@/components/ui/icons'
import { TourCursor } from './tour-cursor'
import { useTour } from './tour-provider'
import type { TourPrepareAction, TourStep } from '@/lib/onboarding/tour-config'

type Rect = { top: number; left: number; width: number; height: number }
type ResolvedTarget = { element: HTMLElement; selector: string }

const TARGET_PADDING = 10
const TARGET_TIMEOUT_MS = 3500
const STEP_POLL_INTERVAL_MS = 120

function normalizeSelectors(target: TourStep['target']) {
  return Array.isArray(target) ? target : [target]
}

function isRouteMatched(pathname: string, step: TourStep) {
  const route = step.route.replace(/\/+$/, '') || '/'
  const current = pathname.replace(/\/+$/, '') || '/'
  if (step.routeMatch === 'prefix') return current === route || current.startsWith(`${route}/`)
  return current === route
}

function isElementVisible(element: HTMLElement) {
  const style = window.getComputedStyle(element)
  if (style.display === 'none') return false
  if (style.visibility === 'hidden' || style.visibility === 'collapse') return false
  if (style.opacity === '0') return false
  if (element.getAttribute('aria-hidden') === 'true') return false

  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0 && element.getClientRects().length > 0
}

function isElementInteractable(element: HTMLElement) {
  if (!isElementVisible(element)) return false
  if (element.hasAttribute('disabled')) return false
  if (element.getAttribute('aria-disabled') === 'true') return false
  if ((element as HTMLButtonElement).disabled === true) return false
  const style = window.getComputedStyle(element)
  if (style.pointerEvents === 'none') return false
  return true
}

function resolveTarget(step: TourStep): ResolvedTarget | null {
  for (const selector of normalizeSelectors(step.target)) {
    const element = document.querySelector<HTMLElement>(selector)
    if (!element) continue
    if (!isElementVisible(element)) continue
    if (step.interactionMode === 'click' && !isElementInteractable(element)) continue
    return { element, selector }
  }

  return null
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function runPrepareActions(actions: TourPrepareAction[]) {
  for (const action of actions) {
    if (action.type !== 'click') continue

    const selectors = Array.isArray(action.target) ? action.target : [action.target]
    let clicked = false

    for (const selector of selectors) {
      const element = document.querySelector<HTMLElement>(selector)
      if (!element) continue
      if (!isElementInteractable(element)) continue
      element.click()
      clicked = true
      break
    }

    if (clicked) {
      await delay(action.delayMs ?? STEP_POLL_INTERVAL_MS)
    }
  }
}

export function TourSpotlight() {
  const {
    config,
    blockStep,
    completeStep,
    currentTourIndex,
    currentTourStep: step,
    isTourActive,
    nextTourStep,
    prevTourStep,
    stopTour,
    totalSteps,
  } = useTour()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const [resolvedTarget, setResolvedTarget] = useState<ResolvedTarget | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const observerRef = useRef<ResizeObserver | null>(null)
  const preparedStepRef = useRef<string | null>(null)
  const requestedRouteRef = useRef<string | null>(null)
  const isFirst = currentTourIndex === 0
  const isLast = currentTourIndex === totalSteps - 1
  const canClickTarget = step?.interactionMode === 'click'

  const clearMeasurement = useCallback(() => {
    observerRef.current?.disconnect()
    setResolvedTarget(null)
    setTargetRect(null)
    setShowContent(false)
  }, [])

  const measureElement = useCallback((element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const isInView = rect.top >= 0 && rect.bottom <= window.innerHeight

    if (!isInView) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      window.requestAnimationFrame(() => {
        measureElement(element)
      })
      return
    }

    setTargetRect({
      top: rect.top - TARGET_PADDING,
      left: rect.left - TARGET_PADDING,
      width: rect.width + TARGET_PADDING * 2,
      height: rect.height + TARGET_PADDING * 2,
    })
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!step) return

    let cancelled = false

    async function verifyStep() {
      clearMeasurement()
      setIsPreparing(false)

      if (!isRouteMatched(pathname, step)) {
        setIsNavigating(true)
        if (requestedRouteRef.current !== step.route) {
          requestedRouteRef.current = step.route
          console.log('[tour] navigate', {
            stepId: step.id,
            from: pathname,
            to: step.route,
          })
          window.location.assign(step.route)
        }
        return
      }

      requestedRouteRef.current = null
      console.log('[tour] route-ready', {
        stepId: step.id,
        pathname,
      })
      setIsNavigating(false)
      setIsPreparing(true)

      const timeoutAt = window.performance.now() + (step.timeoutMs ?? TARGET_TIMEOUT_MS)

      while (!cancelled && window.performance.now() < timeoutAt) {
        const resolved = resolveTarget(step)
        if (resolved) {
          preparedStepRef.current = null
          setResolvedTarget(resolved)
          measureElement(resolved.element)
          setIsPreparing(false)
          return
        }

        if (step.prepare?.length && preparedStepRef.current !== step.id) {
          preparedStepRef.current = step.id
          await runPrepareActions(step.prepare)
          continue
        }

        await delay(STEP_POLL_INTERVAL_MS)
      }

      if (cancelled) return

      console.error('[tour] Blocking unverifiable step', {
        stepId: step.id,
        route: step.route,
        target: step.target,
      })
      setIsPreparing(false)
      blockStep(step.id)
    }

    void verifyStep()

    return () => {
      cancelled = true
      observerRef.current?.disconnect()
    }
  }, [blockStep, clearMeasurement, measureElement, pathname, step])

  useEffect(() => {
    if (!resolvedTarget || !step || isNavigating) return

    const syncRect = () => {
      const next = document.querySelector<HTMLElement>(resolvedTarget.selector)
      if (!next) {
        blockStep(step.id)
        return
      }
      if (!isElementVisible(next)) {
        blockStep(step.id)
        return
      }
      measureElement(next)
    }

    observerRef.current?.disconnect()
    observerRef.current = new ResizeObserver(syncRect)
    observerRef.current.observe(resolvedTarget.element)

    window.addEventListener('scroll', syncRect, true)
    window.addEventListener('resize', syncRect)

    return () => {
      observerRef.current?.disconnect()
      window.removeEventListener('scroll', syncRect, true)
      window.removeEventListener('resize', syncRect)
    }
  }, [blockStep, isNavigating, measureElement, resolvedTarget, step])

  useEffect(() => {
    if (!step || !targetRect || isNavigating || isPreparing) return

    const tooltipWidth = 340
    const tooltipHeight = 180
    const gap = 16
    const viewportWidth = document.documentElement.clientWidth
    const viewportHeight = document.documentElement.clientHeight
    const preferredPlacements: Array<'top' | 'bottom' | 'left' | 'right'> = [
      step.placement,
      'bottom',
      'right',
      'top',
      'left',
    ]

    let top = 16
    let left = 16

    for (const placement of preferredPlacements) {
      let fits = false

      switch (placement) {
        case 'bottom':
          top = targetRect.top + targetRect.height + gap
          left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
          fits = top + tooltipHeight < viewportHeight
          break
        case 'top':
          top = targetRect.top - gap - tooltipHeight
          left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
          fits = top > 0
          break
        case 'right':
          top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
          left = targetRect.left + targetRect.width + gap
          fits = left + tooltipWidth < viewportWidth
          break
        case 'left':
          top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
          left = targetRect.left - tooltipWidth - gap
          fits = left > 0
          break
      }

      if (fits) break
    }

    left = Math.max(16, Math.min(left, viewportWidth - tooltipWidth - 16))
    top = Math.max(16, Math.min(top, viewportHeight - tooltipHeight - 16))

    setTooltipStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
    })

    setShowContent(false)
    const timer = window.setTimeout(() => setShowContent(true), 250)
    return () => window.clearTimeout(timer)
  }, [isNavigating, isPreparing, step, targetRect])

  const handleNext = useCallback(() => {
    if (step) completeStep(step.id)
    clearMeasurement()
    nextTourStep()
  }, [clearMeasurement, completeStep, nextTourStep, step])

  const handlePrev = useCallback(() => {
    clearMeasurement()
    prevTourStep()
  }, [clearMeasurement, prevTourStep])

  const handleSkip = useCallback(() => {
    clearMeasurement()
    stopTour()
  }, [clearMeasurement, stopTour])

  const clickHint = useMemo(() => {
    if (!step) return null
    if (step.interactionMode === 'click') {
      return 'Click the highlighted control or press Next to continue'
    }
    return 'Review the highlighted area, then press Next to continue'
  }, [step])

  if (!mounted || !isTourActive || !step || !targetRect) return null

  return createPortal(
    <>
      <div className="fixed inset-0 z-[90]" aria-hidden="true">
        <svg className="fixed inset-0 h-full w-full">
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="12"
                fill="black"
              />
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

        <div
          className="fixed pointer-events-none rounded-xl animate-tour-target-pulse"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            border: '2px solid rgba(232, 143, 71, 0.7)',
          }}
        />

        {canClickTarget && resolvedTarget && (
          <button
            type="button"
            className="fixed z-[91] cursor-pointer bg-transparent"
            style={{
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
            }}
            aria-label={`Use ${step.title}`}
            onClick={(event) => {
              event.stopPropagation()
              const liveTarget = document.querySelector<HTMLElement>(resolvedTarget.selector)
              if (liveTarget && isElementInteractable(liveTarget)) {
                liveTarget.click()
              }
            }}
          />
        )}
      </div>

      <TourCursor targetRect={targetRect} isActive={!isNavigating && !isPreparing} />

      <div className="fixed inset-0 z-[92] pointer-events-none">
        <div
          key={step.id}
          className={`pointer-events-auto rounded-xl border border-stone-600 bg-stone-900/95 p-5 shadow-2xl backdrop-blur-sm transition-all duration-300 ${
            showContent ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
          }`}
          style={tooltipStyle}
          role="dialog"
          aria-label={step.title}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
              Step {currentTourIndex + 1} of {totalSteps}
            </span>
            <button
              type="button"
              onClick={handleSkip}
              data-tour-action="close"
              className="rounded p-1 text-stone-500 transition-colors hover:text-stone-200"
              aria-label="Close tour"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <h3 className="mb-1.5 text-sm font-semibold text-stone-100">{step.title}</h3>
          <p className="mb-4 text-xs leading-relaxed text-stone-400">{step.description}</p>

          <p className="mb-3 flex items-center gap-1.5 text-[10px] text-brand-400/80">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
            {clickHint}
          </p>

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={handlePrev}
              disabled={isFirst}
              data-tour-action="prev"
              className="h-auto px-2 py-1 text-xs"
            >
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              Back
            </Button>

            <div className="flex items-center gap-1">
              {config.steps.map((tourStep, index) => (
                <div
                  key={tourStep.id}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentTourIndex
                      ? 'w-4 bg-brand-500'
                      : index < currentTourIndex
                        ? 'w-1.5 bg-brand-700'
                        : 'w-1.5 bg-stone-600'
                  }`}
                />
              ))}
            </div>

            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
              data-tour-action="next"
              className="h-auto px-3 py-1 text-xs"
            >
              {isLast ? 'Finish' : 'Next'}
              {!isLast && <ChevronRight className="ml-1 h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
