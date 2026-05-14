'use client'

import Link from 'next/link'
import { Flower, Sun, Leaf, Snowflake, type LucideIcon } from '@/components/ui/icons'
import { ScrollReveal } from './scroll-reveal'
import type { PublicSeasonalMarketPulse } from '@/lib/public/public-seasonal-market-pulse'

type SeasonName = 'Spring' | 'Summer' | 'Fall' | 'Winter'

const SEASON_ICONS: Record<SeasonName, LucideIcon> = {
  Spring: Flower,
  Summer: Sun,
  Fall: Leaf,
  Winter: Snowflake,
}

function getSeasonIcon(name: string) {
  return SEASON_ICONS[name as SeasonName] ?? Flower
}

interface HomepageSeasonalSpotlightProps {
  pulse: PublicSeasonalMarketPulse | null
}

export function HomepageSeasonalSpotlight({ pulse }: HomepageSeasonalSpotlightProps) {
  if (!pulse || pulse.peakNow.length === 0) return null

  const SeasonIcon = getSeasonIcon(pulse.season.name)
  const peakItems = pulse.peakNow.slice(0, 5)

  return (
    <ScrollReveal>
      <section className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="rounded-xl border border-[#5c3520]/50 bg-[#1e0f08]/60 px-5 py-4 backdrop-blur-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            {/* Season label */}
            <div className="flex shrink-0 items-center gap-2">
              <SeasonIcon size={20} className="text-[#e8a96b]" />
              <span className="text-sm font-medium tracking-wide text-stone-300 uppercase">
                {pulse.season.name} Market
              </span>
            </div>

            {/* Peak now pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-stone-500">Peak now</span>
              {peakItems.map((item) => (
                <span
                  key={item.name}
                  className="rounded-full border border-[#e8a96b]/20 bg-[#e8a96b]/10 px-3 py-0.5 text-xs font-medium text-stone-100 shadow-[0_0_6px_rgba(232,169,107,0.12)]"
                  title={item.note}
                >
                  {item.name}
                </span>
              ))}
            </div>

            {/* Ending soon */}
            {pulse.endingSoon && (
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-stone-500">Ending soon</span>
                <span
                  className="rounded-full border border-amber-500/40 bg-amber-900/20 px-3 py-0.5 text-xs font-medium text-amber-300"
                  title={pulse.endingSoon.note}
                >
                  {pulse.endingSoon.name}
                </span>
              </div>
            )}

            {/* CTA link */}
            <div className="sm:ml-auto">
              <Link
                href="/ingredients"
                className="text-xs text-[#e8a96b] transition-colors hover:text-[#f0c08a]"
              >
                See all seasonal ingredients &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  )
}
