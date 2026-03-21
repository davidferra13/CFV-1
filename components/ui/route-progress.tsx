'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Thin brand-colored progress bar at the top of the viewport.
 * Animates during route transitions (like YouTube/GitHub).
 * Pure CSS, zero dependencies.
 */
export function RouteProgress() {
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const prevPath = useRef(pathname)

  useEffect(() => {
    if (pathname === prevPath.current) return
    prevPath.current = pathname

    // Start: show bar and animate to ~80%
    setVisible(true)
    setProgress(0)

    // Tiny delay so the 0% renders first, then animate
    requestAnimationFrame(() => {
      setProgress(80)
    })

    // Complete: jump to 100% then fade out
    timer.current = setTimeout(() => {
      setProgress(100)
      setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 300)
    }, 400)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [pathname])

  if (!visible && progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms' }}
    >
      <div
        className="h-full gradient-accent"
        style={{
          width: `${progress}%`,
          transition:
            progress === 0
              ? 'none'
              : progress === 100
                ? 'width 200ms ease-out'
                : 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 0 8px rgb(var(--brand-500) / 0.4)',
        }}
      />
    </div>
  )
}
