'use client'

import Link from 'next/link'
import type { FallbackAlternative } from '@/app/api/discovery/fallback-check/route'

interface DiscoveryFallbackPanelProps {
  alternatives: FallbackAlternative[]
  broadenedLabel: string | null
  onClear: () => void
  status?: 'processing' | 'no_results'
}

function FallbackChefCard({ chef }: { chef: FallbackAlternative }) {
  const initial = chef.displayName.charAt(0).toUpperCase()

  return (
    <article className="flex min-w-0 gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 motion-safe:transition hover:border-[#e8a96b]/35 hover:bg-[#e8a96b]/[0.07] motion-reduce:transition-none">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e8a96b]/30 bg-[#e8a96b]/12 font-display text-sm font-semibold text-[#ffd6a3]"
        aria-hidden="true"
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <Link
            href={`/chef/${chef.slug}`}
            className="min-w-0 truncate text-sm font-semibold text-[#ffe0ad] motion-safe:transition hover:text-white"
          >
            {chef.displayName}
          </Link>
          {chef.isAccepting && (
            <span className="inline-flex w-fit items-center gap-1 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Available
            </span>
          )}
        </div>
        {(chef.primaryCuisine || chef.locationLabel) && (
          <p className="mt-1 text-[11px] leading-5 text-stone-300">
            {[chef.primaryCuisine, chef.locationLabel].filter(Boolean).join(' / ')}
          </p>
        )}
        <Link
          href={chef.ctaHref}
          className="mt-2 inline-flex min-h-8 items-center justify-center rounded-full border border-[#e8a96b]/45 bg-[#e8a96b]/12 px-3 text-[11px] font-semibold text-[#ffd6a3] motion-safe:transition hover:border-[#e8a96b]/70 hover:bg-[#e8a96b]/20 hover:text-[#ffe8c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a96b]/45"
        >
          {chef.isAccepting ? 'Inquire' : 'View profile'}
        </Link>
      </div>
    </article>
  )
}

function RemyFallbackMark() {
  return (
    <div
      className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#e8a96b]/35 bg-[#2a1409] shadow-[0_10px_30px_rgba(0,0,0,0.24)] sm:h-20 sm:w-20"
      role="img"
      aria-label="Remy is checking the dining board"
    >
      <span className="absolute -top-1 h-3 w-9 rounded-t-full border border-[#e8a96b]/35 bg-[#f3c27f]" />
      <span className="absolute top-3 h-8 w-10 rounded-full border border-[#e8a96b]/25 bg-[#f6b46f]" />
      <span className="absolute top-7 flex w-7 items-center justify-between">
        <span className="h-1.5 w-1.5 rounded-full bg-[#1b0e08]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#1b0e08]" />
      </span>
      <span className="absolute top-10 h-1 w-4 rounded-full bg-[#5c3520]/70" />
      <span className="absolute bottom-3 h-4 w-9 rounded-md border border-[#e8a96b]/25 bg-[#1b0e08]" />
      <span className="absolute bottom-6 right-2 h-3 w-3 rounded-full border border-[#e8a96b]/35 bg-[#e8a96b]/20 motion-safe:animate-pulse motion-reduce:animate-none" />
    </div>
  )
}

export function DiscoveryFallbackPanel({
  alternatives,
  broadenedLabel,
  onClear,
  status = 'no_results',
}: DiscoveryFallbackPanelProps) {
  const isProcessing = status === 'processing'

  return (
    <section
      className="mt-4 rounded-xl border border-[#7a3a1e]/40 bg-[#160b05]/90 px-4 py-5 shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 sm:px-5 sm:py-5"
      aria-live={isProcessing ? 'polite' : 'off'}
      aria-busy={isProcessing}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <RemyFallbackMark />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#e8a96b]/70">
                {isProcessing
                  ? 'Remy is checking'
                  : (broadenedLabel ?? 'Remy found nearby options')}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-white/90 sm:text-xl">
                {isProcessing ? 'Checking the hospitality board' : 'No exact match yet'}
              </h3>
              <p className="mt-1.5 max-w-xl text-[13px] leading-6 text-stone-300">
                {isProcessing
                  ? 'Remy is reviewing availability and widening the request without sharing private details.'
                  : 'That exact combination is not available right now, so Remy widened the search to chefs who can still help with the occasion.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClear}
              className="inline-flex min-h-9 w-full shrink-0 items-center justify-center rounded-full border border-[#e8a96b]/35 bg-[#e8a96b]/10 px-3.5 text-[11px] font-semibold text-[#ffd6a3] motion-safe:transition hover:border-[#e8a96b]/60 hover:bg-[#e8a96b]/18 hover:text-[#ffe8c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a96b]/50 sm:w-auto"
              aria-label="Clear all selected filters"
            >
              Clear selections
            </button>
          </div>

          {alternatives.length > 0 ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {alternatives.map((chef) => (
                <FallbackChefCard key={chef.slug} chef={chef} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-[13px] leading-6 text-stone-300">
              {isProcessing
                ? 'Remy is checking the exact match first, then nearby parent cuisines and format matches.'
                : 'Remy did not find a nearby chef to suggest from this search. Browse the directory or send a request and the team can route it manually.'}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/chefs"
              className="inline-flex min-h-9 items-center justify-center rounded-full border border-[#9a6742]/55 bg-transparent px-4 text-[12px] font-semibold text-[#f2bd84] motion-safe:transition hover:border-[#d4945a]/70 hover:bg-[#2a1409]/60 hover:text-[#ffe0ad] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a96b]/45"
            >
              Browse all chefs
            </Link>
            <Link
              href="/book"
              className="inline-flex min-h-9 items-center justify-center rounded-full border border-[#e8a96b]/50 bg-[#e8a96b]/15 px-4 text-[12px] font-semibold text-[#ffd6a3] motion-safe:transition hover:border-[#e8a96b]/75 hover:bg-[#e8a96b]/22 hover:text-[#ffe8c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a96b]/45"
            >
              Send a request instead
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
