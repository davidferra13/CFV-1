'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Brand-colored progress bar at the top of the viewport.
 * Starts immediately on link CLICK (not pathname change).
 * Completes when the new page renders (pathname updates).
 * Covers link-based navigation; button spinners cover router.push().
 */
export function RouteProgress() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const prevPath = useRef(pathname)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  // Detect navigation START via click delegation on internal links
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const link = (e.target as HTMLElement).closest('a[href]')
      if (!link) return
      const href = link.getAttribute('href')
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:'))
        return
      if (href === pathname) return
      // Don't trigger for new-tab links or downloads (they won't change pathname)
      if (link.getAttribute('target') === '_blank' || link.hasAttribute('download')) return
      // Internal navigation starting - show bar immediately
      clearTimers()
      setVisible(true)
      setProgress(15)
      // Staged progress for realistic feel
      timers.current.push(setTimeout(() => setProgress(30), 150))
      timers.current.push(setTimeout(() => setProgress(50), 500))
      timers.current.push(setTimeout(() => setProgress(70), 1200))
      timers.current.push(setTimeout(() => setProgress(80), 2500))
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [pathname, clearTimers])

  // Navigation COMPLETE - animate to 100% and fade out
  useEffect(() => {
    if (pathname === prevPath.current) return
    prevPath.current = pathname
    clearTimers()

    if (visible) {
      // Already showing from click - complete it
      setProgress(100)
      timers.current.push(
        setTimeout(() => {
          setVisible(false)
          setProgress(0)
        }, 300)
      )
    }
    // If not visible (e.g. back/forward button), don't flash the bar for already-complete nav
  }, [pathname, visible, clearTimers])

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers])

  if (!visible && progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms' }}
    >
      <div
        className="h-full gradient-accent"
        style={{
          width: `${progress}%`,
          transition:
            progress <= 15
              ? 'none'
              : progress === 100
                ? 'width 200ms ease-out'
                : 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 0 10px rgb(var(--brand-500) / 0.5), 0 0 4px rgb(var(--brand-500) / 0.3)',
        }}
      />
    </div>
  )
}
