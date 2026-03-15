'use client'

import { useEffect, useRef, useState } from 'react'
import { clampTooltipText, isTooltipLabelRedundant, normalizeTooltipText } from '@/lib/ui/tooltip'

const POINTER_SHOW_DELAY_MS = 480
const FOCUS_SHOW_DELAY_MS = 140
const HIDE_DELAY_MS = 60
const EXIT_DURATION_MS = 140
const TOOLTIP_VIEWPORT_MARGIN = 12
const TOOLTIP_GAP = 10
const TOOLTIP_ID = 'cf-global-tooltip'
const TOOLTIP_TARGET_SELECTOR = [
  '[data-tooltip]',
  'button',
  'a[href]',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="tab"]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'input[type="range"]',
  'select',
].join(', ')

type TooltipSourceType = 'data-tooltip' | 'aria-description' | 'title' | 'aria-label'

type TooltipCandidate = {
  root: HTMLElement
  source: HTMLElement
  sourceType: TooltipSourceType
  text: string
}

type RenderedTooltip = {
  target: HTMLElement
  text: string
}

type TooltipPosition = {
  top: number
  left: number
  placement: 'top' | 'bottom'
  ready: boolean
}

const DEFAULT_POSITION: TooltipPosition = {
  top: 0,
  left: 0,
  placement: 'top',
  ready: false,
}

type TimerHandle = number

function clearTimer(timerRef: { current: TimerHandle | null }) {
  if (timerRef.current != null) {
    window.clearTimeout(timerRef.current)
    timerRef.current = null
  }
}

function isTooltipSuppressed(element: HTMLElement): boolean {
  if (element.getAttribute('data-tooltip') === 'off') {
    return true
  }

  const skipValue = element.getAttribute('data-tooltip-skip')
  return skipValue != null && skipValue !== 'false'
}

function isTextEntryControl(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase()

  if (tagName === 'textarea' || tagName === 'select') {
    return true
  }

  if (tagName !== 'input') {
    return false
  }

  const inputType = (element.getAttribute('type') ?? 'text').toLowerCase()

  return !['button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'color', 'file'].includes(
    inputType
  )
}

function collectVisibleText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }

  if (!(node instanceof HTMLElement)) {
    return ''
  }

  const className = typeof node.className === 'string' ? node.className : ''

  if (
    node.hasAttribute('hidden') ||
    node.getAttribute('aria-hidden') === 'true' ||
    /\bsr-only\b/.test(className) ||
    /\bhidden\b/.test(className) ||
    node.tagName === 'SVG' ||
    node.tagName === 'IMG'
  ) {
    return ''
  }

  let text = ''

  for (const child of node.childNodes) {
    text += ` ${collectVisibleText(child)}`
  }

  return text
}

function getVisibleText(element: HTMLElement): string {
  return normalizeTooltipText(collectVisibleText(element))
}

function getTooltipRoot(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) {
    return null
  }

  const root = target.closest(TOOLTIP_TARGET_SELECTOR)
  return root instanceof HTMLElement ? root : null
}

function getElementLineage(target: Element, root: HTMLElement): HTMLElement[] {
  const lineage: HTMLElement[] = []
  let current: Element | null = target

  while (current) {
    if (current instanceof HTMLElement) {
      lineage.push(current)
    }

    if (current === root) {
      break
    }

    current = current.parentElement
  }

  if (lineage[lineage.length - 1] !== root) {
    lineage.push(root)
  }

  return lineage
}

function getExplicitTooltipSource(
  element: HTMLElement
): { sourceType: 'data-tooltip' | 'aria-description' | 'title'; text: string } | null {
  const dataTooltip = clampTooltipText(element.getAttribute('data-tooltip'))
  if (dataTooltip && dataTooltip.toLowerCase() !== 'off') {
    return { sourceType: 'data-tooltip', text: dataTooltip }
  }

  const ariaDescription = clampTooltipText(element.getAttribute('aria-description'))
  if (ariaDescription) {
    return { sourceType: 'aria-description', text: ariaDescription }
  }

  const title =
    clampTooltipText(element.getAttribute('title')) ??
    clampTooltipText(element.getAttribute('data-tooltip-title'))

  if (title) {
    return { sourceType: 'title', text: title }
  }

  return null
}

function resolveTooltipCandidate(target: EventTarget | null): TooltipCandidate | null {
  const root = getTooltipRoot(target)
  if (!root || isTooltipSuppressed(root)) {
    return null
  }

  const targetElement = target instanceof Element ? target : root
  const visibleText = getVisibleText(root)

  for (const element of getElementLineage(targetElement, root)) {
    const explicitSource = getExplicitTooltipSource(element)

    if (!explicitSource) {
      continue
    }

    if (
      explicitSource.sourceType !== 'data-tooltip' &&
      visibleText &&
      isTooltipLabelRedundant(explicitSource.text, visibleText)
    ) {
      continue
    }

    return {
      root,
      source: element,
      sourceType: explicitSource.sourceType,
      text: explicitSource.text,
    }
  }

  if (isTextEntryControl(root)) {
    return null
  }

  const ariaLabel = clampTooltipText(root.getAttribute('aria-label'))
  if (!ariaLabel || isTooltipLabelRedundant(ariaLabel, visibleText)) {
    return null
  }

  return {
    root,
    source: root,
    sourceType: 'aria-label',
    text: ariaLabel,
  }
}

function computeTooltipPosition(
  anchorRect: DOMRect,
  tooltipRect: DOMRect,
  viewportWidth: number,
  viewportHeight: number
): TooltipPosition {
  const centeredLeft = anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2
  const left = Math.min(
    Math.max(TOOLTIP_VIEWPORT_MARGIN, centeredLeft),
    viewportWidth - tooltipRect.width - TOOLTIP_VIEWPORT_MARGIN
  )

  const canPlaceAbove = anchorRect.top >= tooltipRect.height + TOOLTIP_GAP + TOOLTIP_VIEWPORT_MARGIN
  const placement: TooltipPosition['placement'] = canPlaceAbove ? 'top' : 'bottom'
  const preferredTop = canPlaceAbove
    ? anchorRect.top - tooltipRect.height - TOOLTIP_GAP
    : anchorRect.bottom + TOOLTIP_GAP

  const top = Math.min(
    Math.max(TOOLTIP_VIEWPORT_MARGIN, preferredTop),
    viewportHeight - tooltipRect.height - TOOLTIP_VIEWPORT_MARGIN
  )

  return {
    top,
    left,
    placement,
    ready: true,
  }
}

export function GlobalTooltipProvider({ children }: { children: React.ReactNode }) {
  const [renderedTooltip, setRenderedTooltip] = useState<RenderedTooltip | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<TooltipPosition>(DEFAULT_POSITION)
  const renderedTooltipRef = useRef<RenderedTooltip | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const showTimerRef = useRef<TimerHandle | null>(null)
  const hideTimerRef = useRef<TimerHandle | null>(null)
  const exitTimerRef = useRef<TimerHandle | null>(null)
  const pendingTargetRef = useRef<HTMLElement | null>(null)
  const activeTargetRef = useRef<HTMLElement | null>(null)
  const interactionModeRef = useRef<'pointer' | 'keyboard'>('pointer')
  const coarsePointerRef = useRef(false)
  const suppressedTitleRef = useRef<{ element: HTMLElement; value: string } | null>(null)

  const restoreSuppressedTitle = () => {
    const suppressedTitle = suppressedTitleRef.current
    if (!suppressedTitle) {
      return
    }

    if (suppressedTitle.element.isConnected && !suppressedTitle.element.hasAttribute('title')) {
      suppressedTitle.element.setAttribute('title', suppressedTitle.value)
    }

    suppressedTitleRef.current = null
  }

  const suppressNativeTitle = (candidate: TooltipCandidate) => {
    restoreSuppressedTitle()

    if (candidate.sourceType !== 'title') {
      return
    }

    const title = candidate.source.getAttribute('title')
    if (!title) {
      return
    }

    candidate.source.setAttribute('data-tooltip-title', title)
    candidate.source.removeAttribute('title')
    suppressedTitleRef.current = {
      element: candidate.source,
      value: title,
    }
  }

  const clearTooltip = (immediate = false) => {
    clearTimer(showTimerRef)
    pendingTargetRef.current = null

    const hideNow = () => {
      clearTimer(hideTimerRef)
      setIsOpen(false)
      activeTargetRef.current = null
      restoreSuppressedTitle()

      clearTimer(exitTimerRef)
      exitTimerRef.current = window.setTimeout(() => {
        setRenderedTooltip(null)
        setPosition(DEFAULT_POSITION)
      }, EXIT_DURATION_MS)
    }

    if (immediate) {
      hideNow()
      return
    }

    clearTimer(hideTimerRef)
    hideTimerRef.current = window.setTimeout(hideNow, HIDE_DELAY_MS)
  }

  const showTooltip = (candidate: TooltipCandidate) => {
    clearTimer(showTimerRef)
    clearTimer(hideTimerRef)
    clearTimer(exitTimerRef)
    pendingTargetRef.current = null
    activeTargetRef.current = candidate.root
    setPosition(DEFAULT_POSITION)
    setRenderedTooltip({
      target: candidate.root,
      text: candidate.text,
    })

    window.requestAnimationFrame(() => {
      setIsOpen(true)
    })
  }

  const scheduleTooltip = (candidate: TooltipCandidate, delay: number) => {
    clearTimer(showTimerRef)
    clearTimer(hideTimerRef)
    clearTimer(exitTimerRef)

    if (
      activeTargetRef.current === candidate.root &&
      renderedTooltipRef.current?.text === candidate.text
    ) {
      suppressNativeTitle(candidate)
      setIsOpen(true)
      return
    }

    pendingTargetRef.current = candidate.root
    suppressNativeTitle(candidate)
    showTimerRef.current = window.setTimeout(() => showTooltip(candidate), delay)
  }

  useEffect(() => {
    const pointerMediaQuery = window.matchMedia('(pointer: coarse)')
    coarsePointerRef.current = pointerMediaQuery.matches

    const handlePointerCapabilityChange = (event: MediaQueryListEvent) => {
      coarsePointerRef.current = event.matches
    }

    if (typeof pointerMediaQuery.addEventListener === 'function') {
      pointerMediaQuery.addEventListener('change', handlePointerCapabilityChange)
    } else {
      pointerMediaQuery.addListener(handlePointerCapabilityChange)
    }

    const handlePointerOver = (event: PointerEvent) => {
      interactionModeRef.current = 'pointer'

      if (event.pointerType === 'touch' || coarsePointerRef.current) {
        return
      }

      const candidate = resolveTooltipCandidate(event.target)
      if (!candidate) {
        return
      }

      if (event.relatedTarget instanceof Node && candidate.root.contains(event.relatedTarget)) {
        return
      }

      scheduleTooltip(candidate, POINTER_SHOW_DELAY_MS)
    }

    const handlePointerOut = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || coarsePointerRef.current) {
        return
      }

      const root = getTooltipRoot(event.target)
      if (!root) {
        return
      }

      if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) {
        return
      }

      if (pendingTargetRef.current === root || activeTargetRef.current === root) {
        clearTooltip()
      }
    }

    const handleFocusIn = (event: FocusEvent) => {
      if (interactionModeRef.current !== 'keyboard') {
        return
      }

      const candidate = resolveTooltipCandidate(event.target)
      if (!candidate) {
        return
      }

      scheduleTooltip(candidate, FOCUS_SHOW_DELAY_MS)
    }

    const handleFocusOut = (event: FocusEvent) => {
      const root = getTooltipRoot(event.target)
      if (!root) {
        return
      }

      if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) {
        return
      }

      if (pendingTargetRef.current === root || activeTargetRef.current === root) {
        clearTooltip(true)
      }
    }

    const handlePointerDown = () => {
      interactionModeRef.current = 'pointer'
      clearTooltip(true)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        interactionModeRef.current = 'keyboard'
      }

      if (event.key === 'Escape') {
        clearTooltip(true)
      }
    }

    const handleViewportChange = () => {
      clearTooltip(true)
    }

    document.addEventListener('pointerover', handlePointerOver, true)
    document.addEventListener('pointerout', handlePointerOut, true)
    document.addEventListener('focusin', handleFocusIn, true)
    document.addEventListener('focusout', handleFocusOut, true)
    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('scroll', handleViewportChange, true)
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('blur', handleViewportChange)

    return () => {
      document.removeEventListener('pointerover', handlePointerOver, true)
      document.removeEventListener('pointerout', handlePointerOut, true)
      document.removeEventListener('focusin', handleFocusIn, true)
      document.removeEventListener('focusout', handleFocusOut, true)
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('scroll', handleViewportChange, true)
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('blur', handleViewportChange)

      if (typeof pointerMediaQuery.removeEventListener === 'function') {
        pointerMediaQuery.removeEventListener('change', handlePointerCapabilityChange)
      } else {
        pointerMediaQuery.removeListener(handlePointerCapabilityChange)
      }

      clearTimer(showTimerRef)
      clearTimer(hideTimerRef)
      clearTimer(exitTimerRef)
      restoreSuppressedTitle()
    }
  }, [])

  useEffect(() => {
    renderedTooltipRef.current = renderedTooltip
  }, [renderedTooltip])

  useEffect(() => {
    if (!renderedTooltip || !tooltipRef.current) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      if (!renderedTooltip.target.isConnected || !tooltipRef.current) {
        clearTooltip(true)
        return
      }

      const nextPosition = computeTooltipPosition(
        renderedTooltip.target.getBoundingClientRect(),
        tooltipRef.current.getBoundingClientRect(),
        window.innerWidth,
        window.innerHeight
      )

      setPosition(nextPosition)
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [renderedTooltip])

  return (
    <>
      {children}
      <div
        className="pointer-events-none fixed inset-0 z-[140]"
        aria-hidden={renderedTooltip ? undefined : true}
      >
        {renderedTooltip ? (
          <div
            id={TOOLTIP_ID}
            ref={tooltipRef}
            role="tooltip"
            className="pointer-events-none fixed max-w-[calc(100vw-1.5rem)] rounded-xl border border-brand-500/20 bg-stone-950/95 px-3 py-2 text-[11px] font-medium leading-4 text-stone-100 shadow-[0_18px_40px_rgba(0,0,0,0.4)] backdrop-blur-sm transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none sm:max-w-72"
            style={{
              top: position.top,
              left: position.left,
              opacity: isOpen && position.ready ? 1 : 0,
              transform: `translateY(${
                isOpen ? '0px' : position.placement === 'top' ? '4px' : '-4px'
              }) scale(${isOpen ? 1 : 0.98})`,
            }}
          >
            {renderedTooltip.text}
          </div>
        ) : null}
      </div>
    </>
  )
}
