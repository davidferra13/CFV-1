'use client'

import { useEffect, useState } from 'react'

const ROTATION_INTERVAL_MS = 8000
const FADE_DURATION_MS = 300

type HomepageLiveSignalProps = {
  messages: readonly string[]
  className?: string
}

export function HomepageLiveSignal({
  messages,
  className = '',
}: HomepageLiveSignalProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const activeMessage = messages[activeIndex] ?? messages[0] ?? ''

  useEffect(() => {
    setActiveIndex(0)
    setIsVisible(true)
  }, [messages])

  useEffect(() => {
    if (messages.length < 2 || prefersReducedMotion) return

    let rotationTimeout: ReturnType<typeof setTimeout> | null = null
    let fadeTimeout: ReturnType<typeof setTimeout> | null = null

    const scheduleRotation = () => {
      rotationTimeout = setTimeout(() => {
        setIsVisible(false)

        fadeTimeout = setTimeout(() => {
          setActiveIndex((current) => (current + 1) % messages.length)
          setIsVisible(true)
          scheduleRotation()
        }, FADE_DURATION_MS)
      }, ROTATION_INTERVAL_MS)
    }

    scheduleRotation()

    return () => {
      if (rotationTimeout) clearTimeout(rotationTimeout)
      if (fadeTimeout) clearTimeout(fadeTimeout)
    }
  }, [messages.length, prefersReducedMotion])

  if (!activeMessage) return null

  return (
    <p
      title={activeMessage}
      className={`max-w-full truncate text-sm font-medium leading-6 tracking-[0.01em] text-stone-400 sm:text-[15px] ${className}`}
      style={{
        opacity: prefersReducedMotion ? 1 : isVisible ? 1 : 0,
        transition: prefersReducedMotion ? 'none' : 'opacity 300ms var(--ease-spring)',
      }}
    >
      {activeMessage}
    </p>
  )
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches)

    updatePreference()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference)
      return () => mediaQuery.removeEventListener('change', updatePreference)
    }

    mediaQuery.addListener(updatePreference)
    return () => mediaQuery.removeListener(updatePreference)
  }, [])

  return prefersReducedMotion
}
