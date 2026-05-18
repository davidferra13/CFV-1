'use client'

import Image from 'next/image'
import Link from 'next/link'
import { getOptimizedAvatar } from '@/lib/images/cloudinary'
import type { FallbackAlternative } from '@/app/api/discovery/fallback-check/route'

interface DiscoveryFallbackPanelProps {
  alternatives: FallbackAlternative[]
  broadenedLabel: string | null
  onClear: () => void
}

function FallbackChefCard({ chef }: { chef: FallbackAlternative }) {
  const initial = chef.displayName.charAt(0).toUpperCase()

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-[#5c3520]/50 bg-[#1b0e08]/90 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-[#9a6742]/60 hover:shadow-xl">
      {/* Image */}
      <Link
        href={`/chef/${chef.slug}`}
        className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#2a100a] to-[#1a0a06]"
        tabIndex={-1}
      >
        {chef.profileImageUrl ? (
          <Image
            src={getOptimizedAvatar(chef.profileImageUrl, 400)}
            alt={chef.displayName}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-display text-6xl text-[#e8a96b]/40">{initial}</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {chef.isAccepting && (
          <div className="absolute left-3 top-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-emerald-300 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Available
            </span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <Link
          href={`/chef/${chef.slug}`}
          className="text-sm font-semibold text-[#f2bd84] transition-colors hover:text-[#ffe0ad]"
        >
          {chef.displayName}
        </Link>
        {(chef.primaryCuisine || chef.locationLabel) && (
          <p className="text-[11px] text-stone-400">
            {[chef.primaryCuisine, chef.locationLabel].filter(Boolean).join(' · ')}
          </p>
        )}
        <Link
          href={chef.ctaHref}
          className="mt-auto inline-flex min-h-8 items-center justify-center rounded-full border border-[#e8a96b]/45 bg-[#e8a96b]/12 px-3 text-[11px] font-semibold text-[#ffd6a3] transition-colors hover:border-[#e8a96b]/70 hover:bg-[#e8a96b]/20 hover:text-[#ffe8c8]"
        >
          {chef.isAccepting ? 'Inquire' : 'View profile'}
        </Link>
      </div>
    </article>
  )
}

export function DiscoveryFallbackPanel({
  alternatives,
  broadenedLabel,
  onClear,
}: DiscoveryFallbackPanelProps) {
  return (
    <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-[#7a3a1e]/40 bg-[#160b05]/85 px-4 py-5 shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-sm sm:px-6 sm:py-6 duration-300">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#e8a96b]/65">
            {broadenedLabel ?? 'Highly rated alternatives'}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white/90 sm:text-xl">
            Exploring Other Tastes
          </h3>
          <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-stone-400">
            We don't have a chef available for that exact match right now. Here are some highly
            rated alternatives.
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex shrink-0 min-h-8 items-center justify-center rounded-full border border-[#e8a96b]/35 bg-[#e8a96b]/10 px-3.5 text-[11px] font-semibold text-[#ffd6a3] transition-colors hover:border-[#e8a96b]/60 hover:bg-[#e8a96b]/18 hover:text-[#ffe8c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a96b]/50"
          aria-label="Clear all selected filters"
        >
          Clear Selections
        </button>
      </div>

      {/* Masonry-style card grid */}
      {alternatives.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alternatives.map((chef) => (
            <FallbackChefCard key={chef.slug} chef={chef} />
          ))}
        </div>
      )}

      {/* Footer action */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href="/chefs"
          className="inline-flex min-h-9 items-center justify-center rounded-full border border-[#9a6742]/55 bg-transparent px-4 text-[12px] font-semibold text-[#f2bd84] transition-colors hover:border-[#d4945a]/70 hover:bg-[#2a1409]/60 hover:text-[#ffe0ad]"
        >
          Browse all chefs
        </Link>
        <Link
          href="/book"
          className="inline-flex min-h-9 items-center justify-center rounded-full border border-[#e8a96b]/50 bg-[#e8a96b]/15 px-4 text-[12px] font-semibold text-[#ffd6a3] transition-colors hover:border-[#e8a96b]/75 hover:bg-[#e8a96b]/22 hover:text-[#ffe8c8]"
        >
          Send a request instead
        </Link>
      </div>
    </div>
  )
}
