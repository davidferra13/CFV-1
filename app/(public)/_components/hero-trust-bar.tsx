'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ScrollReveal } from './scroll-reveal'

interface HeroTrustBarProps {
  stats: {
    verifiedChefCount: number | null
    cityCoveredCount: number | null
    cuisineTypeCount: number | null
    avgRating: number | null
  }
  avatarChefs: Array<{
    slug: string
    displayName: string
    imageUrl: string
  }>
}

export function HeroTrustBar({ stats, avatarChefs }: HeroTrustBarProps) {
  const hasAvatars = avatarChefs.length > 0
  const hasStats =
    stats.verifiedChefCount !== null ||
    stats.cityCoveredCount !== null ||
    stats.cuisineTypeCount !== null ||
    stats.avgRating !== null

  if (!hasAvatars && !hasStats) return null

  return (
    <ScrollReveal>
      <div className="mt-8 flex flex-col items-center gap-3">
        <div className="mx-auto max-w-2xl rounded-2xl border border-stone-700/30 bg-stone-900/40 px-6 py-4 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            {/* Avatar row */}
            {hasAvatars && (
              <div className="flex items-center justify-center">
                {avatarChefs.map((chef, i) => (
                  <Link
                    key={chef.slug}
                    href={`/chef/${chef.slug}`}
                    className={`relative block h-12 w-12 overflow-hidden rounded-full border-2 border-[#1a0e08] transition-transform hover:-translate-y-1 hover:z-10 ${i === 0 ? '' : '-ml-3'}`}
                  >
                    <Image
                      src={chef.imageUrl}
                      alt={chef.displayName}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  </Link>
                ))}
              </div>
            )}

            {/* Trust headline */}
            {stats.verifiedChefCount !== null && stats.cityCoveredCount !== null && (
              <p className="text-sm text-stone-400">
                {stats.verifiedChefCount}+ directory-approved public chef profiles across{' '}
                {stats.cityCoveredCount}+ cities
              </p>
            )}

            {/* Stat pills */}
            {hasStats && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {stats.avgRating !== null && (
                  <span className="rounded-full border border-stone-700/40 bg-stone-800/50 px-3 py-1 text-xs text-amber-400">
                    ★ {stats.avgRating}
                  </span>
                )}
                {stats.cuisineTypeCount !== null && (
                  <span className="rounded-full border border-stone-700/40 bg-stone-800/50 px-3 py-1 text-xs text-stone-400">
                    {stats.cuisineTypeCount} cuisines
                  </span>
                )}
                {stats.cityCoveredCount !== null && (
                  <span className="rounded-full border border-stone-700/40 bg-stone-800/50 px-3 py-1 text-xs text-stone-400">
                    {stats.cityCoveredCount}+ cities
                  </span>
                )}
              </div>
            )}

            {/* Tagline */}
            <p className="text-xs text-stone-500">
              Profile data comes from live ChefFlow records.{' '}
              <Link href="/trust" className="font-medium text-brand-300 hover:text-brand-200">
                See what ChefFlow verifies.
              </Link>
            </p>
          </div>
        </div>
      </div>
    </ScrollReveal>
  )
}
