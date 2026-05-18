'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Tier = 'critical' | 'action' | 'awareness' | 'opportunity'

const BASE_SPEED: Record<Tier, number> = {
  critical: 0.8,
  action: 0.5,
  awareness: 0.35,
  opportunity: 0.25,
}

const RESUME_DELAY_MS = 3500

export function useAutoScroll(options: { tier: Tier; itemCount: number; enabled?: boolean }): {
  scrollRef: React.RefObject<HTMLDivElement>
  isScrolling: boolean
} {
  const { tier, itemCount, enabled = true } = options
  const scrollRef = useRef<HTMLDivElement>(null!)
  const rafRef = useRef<number>(0)
  const pausedRef = useRef(false)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const [isScrolling, setIsScrolling] = useState(false)
  const prefersReducedMotion = useRef(false)

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const hasOverflow = useCallback(() => {
    const el = scrollRef.current
    if (!el) return false
    return el.scrollWidth > el.clientWidth + 2
  }, [])

  const speed = BASE_SPEED[tier] * Math.max(1, itemCount / 5)

  const tick = useCallback(() => {
    const el = scrollRef.current
    if (!el || pausedRef.current || !hasOverflow()) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }

    const maxScroll = el.scrollWidth - el.clientWidth
    el.scrollLeft += speed

    if (el.scrollLeft >= maxScroll - 1) {
      el.style.scrollBehavior = 'auto'
      el.scrollLeft = 0
      el.style.scrollBehavior = ''
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [speed, hasOverflow])

  const pause = useCallback(() => {
    pausedRef.current = true
    setIsScrolling(false)
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
  }, [])

  const scheduleResume = useCallback(() => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false
      setIsScrolling(true)
    }, RESUME_DELAY_MS)
  }, [])

  useEffect(() => {
    if (!enabled || prefersReducedMotion.current) return

    const el = scrollRef.current
    if (!el) return

    el.style.scrollBehavior = 'auto'
    pausedRef.current = false
    setIsScrolling(true)

    rafRef.current = requestAnimationFrame(tick)

    const onMouseEnter = () => pause()
    const onMouseLeave = () => scheduleResume()
    const onTouchStart = () => pause()
    const onTouchEnd = () => scheduleResume()
    const onWheel = () => {
      pause()
      scheduleResume()
    }

    el.addEventListener('mouseenter', onMouseEnter)
    el.addEventListener('mouseleave', onMouseLeave)
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('wheel', onWheel, { passive: true })

    return () => {
      cancelAnimationFrame(rafRef.current)
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
      el.removeEventListener('mouseenter', onMouseEnter)
      el.removeEventListener('mouseleave', onMouseLeave)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('wheel', onWheel)
    }
  }, [enabled, tick, pause, scheduleResume])

  return { scrollRef, isScrolling }
}
