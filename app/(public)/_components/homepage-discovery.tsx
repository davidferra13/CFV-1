'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { HomepageSearch } from './homepage-search'
import { CuisineMarquee } from './cuisine-marquee'
import { Info, X } from '@/components/ui/icons'
import type {
  DiscoveryRailItem,
  FeaturedChefRailData,
  HomepageLocationContext,
} from '@/lib/discovery/homepage-discovery-rail'
import type { UserScrollSignals } from '@/lib/discovery/user-scroll-signals'
import { useUserLocation } from '@/lib/location/use-user-location'

/**
 * HomepageDiscovery owns the shared location context between the search form
 * and the moving discovery rail. When a user enters a location in the search
 * form, clicking a relevant rail item carries that context into the destination
 * route.
 *
 * This wrapper replaces direct usage of <HomepageSearch> + <CuisineMarquee> in
 * the homepage server component, without touching either child's internal logic.
 */
interface HomepageDiscoveryProps {
  /** Featured chefs from the server component, threaded through to CuisineMarquee. */
  featuredChefs?: FeaturedChefRailData[] | null
  /** Culinary signal items from the server component. Seasonal ingredient discovery inserts. */
  culinarySignals?: DiscoveryRailItem[] | null
  /** Authenticated user preference signals. Null for anonymous users. */
  userSignals?: UserScrollSignals | null
  /** Server-read saved location so discovery links include location in the initial HTML. */
  initialLocationContext?: HomepageLocationContext | null
}

export function HomepageDiscovery({
  featuredChefs = null,
  culinarySignals = null,
  userSignals = null,
  initialLocationContext = null,
}: HomepageDiscoveryProps) {
  const [locationContext, setLocationContext] = useState<HomepageLocationContext | null>(
    initialLocationContext
  )
  const [showInfo, setShowInfo] = useState(false)

  const { savedLocation, hydrated } = useUserLocation()

  useEffect(() => {
    if (!hydrated || !savedLocation) return
    setLocationContext({
      location: savedLocation.displayLabel,
      lat: savedLocation.lat,
      lng: savedLocation.lng,
    })
  }, [hydrated, savedLocation])

  const handleContextChange = useCallback((ctx: HomepageLocationContext) => {
    setLocationContext(ctx)
  }, [])

  return (
    <div className="homepage-discovery-shell">
      <div className="mx-auto mt-5 max-w-2xl sm:mt-5">
        <HomepageSearch onContextChange={handleContextChange} />
      </div>
      <div className="mx-auto mt-2 flex justify-center">
        <button
          type="button"
          aria-controls="homepage-discovery-info"
          aria-expanded={showInfo}
          onClick={() => setShowInfo((value) => !value)}
          className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs font-semibold text-stone-100 shadow-sm transition hover:border-[#e8a96b]/40 hover:bg-[#e8a96b]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a96b]/60"
        >
          <Info className="h-4 w-4" aria-hidden="true" />
          {showInfo ? 'Hide discovery details' : 'Discovery details'}
        </button>
      </div>
      {showInfo && (
        <div
          id="homepage-discovery-info"
          className="mx-auto mt-2 max-w-2xl rounded-xl border border-white/10 bg-[#160f0b]/95 p-3 text-left shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-stone-100">How ChefFlow discovery works</h2>
              <p className="mt-1 text-sm leading-relaxed text-stone-300">
                Search by location or service, compare public chef profiles with real menus and
                visible price signals, then book or inquire directly with the chef.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close discovery details"
              onClick={() => setShowInfo(false)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a96b]/60"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {[
              ['How it works', '/how-it-works'],
              ['FAQ', '/faq'],
              ['Browse chefs', '/chefs'],
              ['Book', '/book'],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-sm font-semibold text-stone-100 transition hover:border-[#e8a96b]/35 hover:bg-[#e8a96b]/10"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="mx-auto mt-2 w-full max-w-5xl px-2">
        <div className="discovery-container !py-3">
          <CuisineMarquee
            locationContext={locationContext}
            featuredChefs={featuredChefs}
            culinarySignals={culinarySignals}
            userSignals={userSignals}
            variant="compact"
          />
        </div>
      </div>
    </div>
  )
}
