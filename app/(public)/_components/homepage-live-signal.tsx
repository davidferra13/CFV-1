'use client'

import { useEffect, useState } from 'react'

const ROTATION_INTERVAL_MS = 8000

type HomepageLiveSignalProps = {
  messages: readonly string[]
  className?: string
  truncate?: boolean
}

export function HomepageLiveSignal({
  messages,
  className = '',
  truncate = true,
}: HomepageLiveSignalProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)

  const activeMessage = messages[activeIndex] ?? messages[0] ?? ''

  useEffect(() => {
    setActiveIndex(0)
  }, [messages])

  useEffect(() => {
    if (messages.length < 2 || prefersReducedMotion) return

    const rotationTimer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % messages.length)
    }, ROTATION_INTERVAL_MS)

    return () => {
      clearInterval(rotationTimer)
    }
  }, [messages.length, prefersReducedMotion])

  if (!activeMessage) return null

  return (
    <p
      title={activeMessage}
      className={`max-w-full text-sm font-medium leading-6 tracking-[0.01em] text-stone-400 sm:text-[15px] ${
        truncate ? 'truncate' : ''
      } ${className}`}
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
