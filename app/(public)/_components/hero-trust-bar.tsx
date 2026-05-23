'use client'

import Image from 'next/image'
import Link from 'next/link'

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
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-stone-400">
      {hasAvatars && (
        <div className="flex items-center justify-center">
          {avatarChefs.map((chef, i) => (
            <Link
              key={chef.slug}
              href={`/chef/${chef.slug}`}
              className={`relative block h-8 w-8 overflow-hidden rounded-full border-2 border-[#1a0e08] transition-transform hover:-translate-y-0.5 hover:z-10 ${i === 0 ? '' : '-ml-2'}`}
              title={chef.displayName}
            >
              <Image
                src={chef.imageUrl}
                alt={chef.displayName}
                width={32}
                height={32}
                className="h-full w-full object-cover"
              />
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {stats.verifiedChefCount !== null && stats.cityCoveredCount !== null && (
          <span>
            {stats.verifiedChefCount}+ verified profiles across {stats.cityCoveredCount}+ cities
          </span>
        )}
        {stats.avgRating !== null && <span className="text-amber-300">* {stats.avgRating}</span>}
        {stats.cuisineTypeCount !== null && <span>{stats.cuisineTypeCount} cuisines</span>}
        <Link href="/trust" className="font-medium text-brand-300 hover:text-brand-200">
          Verification standards
        </Link>
      </div>
    </div>
  )
}
