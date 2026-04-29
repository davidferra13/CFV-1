'use client'

import { useEffect } from 'react'

export function HomepageMotionController() {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches) return

    let frame = 0

    const updateScrollDepth = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const depth = Math.min(window.scrollY / 900, 1)
        document.documentElement.style.setProperty('--homepage-scroll-depth', depth.toFixed(4))
        document.documentElement.style.setProperty(
          '--homepage-depth-near-y',
          `${(-10 * depth).toFixed(2)}px`
        )
        document.documentElement.style.setProperty(
          '--homepage-depth-copy-y',
          `${(7 * depth).toFixed(2)}px`
        )
        document.documentElement.style.setProperty(
          '--homepage-depth-far-y',
          `${(-16 * depth).toFixed(2)}px`
        )
      })
    }

    updateScrollDepth()
    window.addEventListener('scroll', updateScrollDepth, { passive: true })

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', updateScrollDepth)
      document.documentElement.style.removeProperty('--homepage-scroll-depth')
      document.documentElement.style.removeProperty('--homepage-depth-near-y')
      document.documentElement.style.removeProperty('--homepage-depth-copy-y')
      document.documentElement.style.removeProperty('--homepage-depth-far-y')
    }
  }, [])

  return null
}
