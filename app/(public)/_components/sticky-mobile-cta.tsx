'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PUBLIC_CONSUMER_DISCOVERY_ENTRY } from '@/lib/public/public-surface-config'

/**
 * Floating "Find a Chef" button that slides up from the bottom on mobile only
 * after the hero CTA sentinel scrolls out of view. Hidden on sm+ viewports via CSS.
 */
export function StickyMobileCta({ sentinelId }: { sentinelId: string }) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const sentinel = document.getElementById(sentinelId)
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShown(!entry.isIntersecting)
      },
      { threshold: 0, rootMargin: '0px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinelId])

  return (
    <div
      data-shown={shown || undefined}
      className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 translate-y-6 opacity-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-[shown]:pointer-events-auto data-[shown]:translate-y-0 data-[shown]:opacity-100 sm:hidden"
    >
      <Link
        href={PUBLIC_CONSUMER_DISCOVERY_ENTRY.href}
        tabIndex={shown ? undefined : -1}
        className="inline-flex h-12 items-center gap-2 rounded-full border border-amber-500/25 bg-[#231008]/88 px-6 text-sm font-semibold text-amber-200/90 shadow-[0_4px_28px_rgba(0,0,0,0.45),_0_0_0_1px_rgba(232,169,107,0.12)] backdrop-blur-xl transition-transform active:scale-95"
      >
        <span className="text-[15px]" aria-hidden="true">
          🍽️
        </span>
        Find a Chef
      </Link>
    </div>
  )
}
