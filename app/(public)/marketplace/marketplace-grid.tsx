'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { MarketplaceChefResult } from '@/lib/marketplace/chef-search-actions'

type Props = {
  chefs: MarketplaceChefResult[]
  total: number
  page: number
  pageSize: number
}

export function MarketplaceGrid({ chefs, total, page, pageSize }: Props) {
  if (chefs.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-gray-500">No chefs found matching your criteria.</p>
        <p className="mt-2 text-sm text-gray-400">
          Try adjusting your filters or search in a different area.
        </p>
      </div>
    )
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {chefs.map((chef) => (
          <ChefCard key={chef.chefId} chef={chef} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {page > 1 && <PaginationLink page={page - 1} label="Previous" />}
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && <PaginationLink page={page + 1} label="Next" />}
        </div>
      )}
    </>
  )
}

function ChefCard({ chef }: { chef: MarketplaceChefResult }) {
  const href = chef.slug ? `/marketplace/${chef.slug}` : '#'
  const imageUrl = chef.heroImageUrl || chef.profileImageUrl

  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg"
    >
      <div className="relative h-48 w-full bg-gray-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={chef.displayName}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl">👨‍🍳</span>
          </div>
        )}

        {chef.acceptingInquiries && (
          <span className="absolute right-2 top-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Available
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-orange-600">
          {chef.displayName}
        </h3>

        {chef.serviceAreaCity && (
          <p className="mt-0.5 text-sm text-gray-500">
            {chef.serviceAreaCity}
            {chef.serviceAreaState ? `, ${chef.serviceAreaState}` : ''}
          </p>
        )}

        {chef.cuisineTypes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {chef.cuisineTypes.slice(0, 3).map((cuisine) => (
              <span
                key={cuisine}
                className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700"
              >
                {cuisine}
              </span>
            ))}
            {chef.cuisineTypes.length > 3 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                +{chef.cuisineTypes.length - 3}
              </span>
            )}
          </div>
        )}

        {chef.reviewCount > 0 && (
          <div className="mt-2 flex items-center gap-1 text-sm">
            <span className="text-yellow-500">★</span>
            <span className="font-medium">{chef.avgRating.toFixed(1)}</span>
            <span className="text-gray-400">({chef.reviewCount})</span>
          </div>
        )}

        {chef.highlightText && (
          <p className="mt-2 line-clamp-2 text-sm text-gray-600">{chef.highlightText}</p>
        )}
      </div>
    </Link>
  )
}

function PaginationLink({ page, label }: { page: number; label: string }) {
  return (
    <Link
      href={`/marketplace?page=${page}`}
      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      {label}
    </Link>
  )
}
