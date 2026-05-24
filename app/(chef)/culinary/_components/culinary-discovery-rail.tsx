'use client'

import dynamic from 'next/dynamic'
import type {
  DiscoveryRailItem,
  FeaturedChefRailData,
} from '@/lib/discovery/homepage-discovery-rail'

const CuisineMarquee = dynamic(
  () => import('@/app/(public)/_components/cuisine-marquee').then((m) => m.CuisineMarquee),
  { ssr: false }
)

interface CulinaryDiscoveryRailProps {
  featuredChefs?: FeaturedChefRailData[] | null
  culinarySignals?: DiscoveryRailItem[] | null
}

export function CulinaryDiscoveryRail({
  featuredChefs = null,
  culinarySignals = null,
}: CulinaryDiscoveryRailProps) {
  return (
    <div className="rounded-xl border border-stone-800/60 bg-stone-950/80 px-3 py-4">
      <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-stone-500">
        Culinary inspiration
      </p>
      <CuisineMarquee
        featuredChefs={featuredChefs}
        culinarySignals={culinarySignals}
        variant="compact"
      />
    </div>
  )
}
