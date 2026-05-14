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

const SEASON_PALETTES: Record<
  string,
  { bg: string; border: string; accent: string; pillBg: string; pillBorder: string }
> = {
  Spring: {
    bg: 'bg-emerald-950/20',
    border: 'border-emerald-700/30',
    accent: 'text-emerald-400',
    pillBg: 'bg-emerald-500/10',
    pillBorder: 'border-emerald-500/20',
  },
  Summer: {
    bg: 'bg-amber-950/20',
    border: 'border-amber-700/30',
    accent: 'text-amber-400',
    pillBg: 'bg-amber-500/10',
    pillBorder: 'border-amber-500/20',
  },
  Fall: {
    bg: 'bg-orange-950/20',
    border: 'border-orange-700/30',
    accent: 'text-orange-400',
    pillBg: 'bg-orange-500/10',
    pillBorder: 'border-orange-500/20',
  },
  Winter: {
    bg: 'bg-slate-900/20',
    border: 'border-slate-600/30',
    accent: 'text-slate-300',
    pillBg: 'bg-slate-500/10',
    pillBorder: 'border-slate-500/20',
  },
}

const DEFAULT_PALETTE = SEASON_PALETTES.Spring

function getSeasonIcon(name: string) {
  return SEASON_ICONS[name as SeasonName] ?? Flower
}

function getSeasonPalette(name: string) {
  return SEASON_PALETTES[name] ?? DEFAULT_PALETTE
}

interface HomepageSeasonalSpotlightProps {
  pulse: PublicSeasonalMarketPulse | null
}

export function HomepageSeasonalSpotlight({ pulse }: HomepageSeasonalSpotlightProps) {
  if (!pulse || pulse.peakNow.length === 0) return null

  const SeasonIcon = getSeasonIcon(pulse.season.name)
  const palette = getSeasonPalette(pulse.season.name)
  const peakItems = pulse.peakNow.slice(0, 5)

  return (
    <ScrollReveal>
      <section className={`w-full border-y ${palette.bg} ${palette.border} py-6`}>
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            {/* Season badge + header */}
            <div className="flex shrink-0 items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${palette.pillBg} ${palette.pillBorder} text-stone-300`}
              >
                <SeasonIcon size={14} className={palette.accent} />
                {pulse.season.name}
              </span>
              <span className="text-sm font-medium tracking-wide text-stone-200">
                What&apos;s fresh right now
              </span>
            </div>

            {/* Peak now pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-stone-500">Peak now</span>
              {peakItems.map((item) => (
                <span
                  key={item.name}
                  className={`rounded-full border px-3 py-0.5 text-xs font-medium text-stone-100 ${palette.pillBg} ${palette.pillBorder}`}
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
                  className={`rounded-full border px-3 py-0.5 text-xs font-medium text-amber-300 border-amber-500/40 bg-amber-900/20`}
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
                className={`text-xs transition-opacity hover:opacity-80 ${palette.accent}`}
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
