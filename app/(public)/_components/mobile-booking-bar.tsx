'use client'

import { useEffect, useState } from 'react'
import { TrackedLink } from '@/components/analytics/tracked-link'

export function MobileBookingBar() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const update = () => setVisible(window.scrollY > 420)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <div
      className={[
        'fixed inset-x-3 bottom-3 z-40 md:hidden',
        visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        'transition-opacity duration-200',
      ].join(' ')}
      aria-hidden={!visible}
    >
      <div className="rounded-2xl border border-stone-700/80 bg-stone-950/95 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 px-2">
            <p className="truncate text-xs font-semibold text-stone-100">Ready to plan it?</p>
            <p className="truncate text-[11px] text-stone-500">
              Send one request to matched chefs.
            </p>
          </div>
          <TrackedLink
            href="/book"
            analyticsName="home_mobile_sticky_booking"
            analyticsProps={{ section: 'mobile_booking_bar' }}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl gradient-accent px-4 text-xs font-semibold text-white"
          >
            Book
          </TrackedLink>
        </div>
      </div>
    </div>
  )
}
