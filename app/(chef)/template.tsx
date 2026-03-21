'use client'

import { useEffect, useRef } from 'react'

/**
 * Chef portal page transition wrapper.
 * Next.js `template.tsx` re-mounts on every navigation, triggering the
 * fade-up entrance animation each time a page changes.
 */
export default function ChefTemplate({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Trigger the entrance animation on mount
    el.classList.add('page-enter-active')
    return () => {
      el.classList.remove('page-enter-active')
    }
  }, [])

  return (
    <div ref={ref} className="page-enter">
      {children}
    </div>
  )
}
