import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDirectoryListingBySlug } from '@/lib/discover/actions'
import { getBusinessTypeLabel, getCuisineLabel } from '@/lib/discover/constants'
import { ClaimRemoveActions } from './_components/claim-remove-actions'

type Props = {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getDirectoryListingBySlug(params.slug)
  if (!listing) return { title: 'Listing Not Found' }

  const location = [listing.city, listing.state].filter(Boolean).join(', ')
  return {
    title: `${listing.name}${location ? ` - ${location}` : ''} | ChefFlow Directory`,
    description:
      listing.description ||
      `${listing.name} is a ${getBusinessTypeLabel(listing.business_type)}${location ? ` in ${location}` : ''}.`,
  }
}

export default async function ListingDetailPage({ params }: Props) {
  const listing = await getDirectoryListingBySlug(params.slug)

  if (!listing) {
    notFound()
  }

  const location = [listing.city, listing.state].filter(Boolean).join(', ')
  const cuisineLabels = listing.cuisine_types.map(getCuisineLabel)
  const isEnriched = listing.status === 'claimed' || listing.status === 'verified'
  const hasPhotos = listing.photo_urls.length > 0

  return (
    <div className="min-h-screen bg-stone-950">
      {/* Back nav */}
      <div className="border-b border-stone-800/50">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/discover"
            className="text-sm text-stone-400 transition-colors hover:text-stone-200"
          >
            &larr; Back to directory
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-stone-100 md:text-3xl">{listing.name}</h1>
              {listing.status === 'verified' && (
                <span className="rounded-full bg-emerald-900/80 px-2.5 py-0.5 text-xxs font-semibold text-emerald-300">
                  Verified
                </span>
              )}
              {listing.status === 'claimed' && (
                <span className="rounded-full bg-brand-900/80 px-2.5 py-0.5 text-xxs font-semibold text-brand-300">
                  Claimed
                </span>
              )}
              {listing.status === 'discovered' && (
                <span className="rounded-full bg-stone-800 px-2.5 py-0.5 text-xxs font-semibold text-stone-400">
                  Discovered
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-stone-400">
              <span className="rounded-full bg-stone-800 px-2.5 py-0.5 text-xs font-medium">
                {getBusinessTypeLabel(listing.business_type)}
              </span>
              {location && <span>{location}</span>}
              {listing.price_range && (
                <span className="font-semibold text-stone-300">{listing.price_range}</span>
              )}
            </div>
          </div>

          <div className="flex flex-shrink-0 gap-2">
            {listing.website_url && (
              <a
                href={listing.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Visit website
              </a>
            )}
            {listing.menu_url && (
              <a
                href={listing.menu_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-stone-700 px-5 py-2.5 text-sm font-medium text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100"
              >
                View menu
              </a>
            )}
          </div>
        </div>

        {/* Photo gallery */}
        {hasPhotos && (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {listing.photo_urls.slice(0, 6).map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`${listing.name} photo ${i + 1}`}
                className="aspect-[4/3] w-full rounded-xl object-cover"
              />
            ))}
          </div>
        )}

        {/* Details grid */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {listing.description && (
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-5">
                <h2 className="text-sm font-semibold text-stone-200">About</h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-400">{listing.description}</p>
              </div>
            )}

            {cuisineLabels.length > 0 && (
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-5">
                <h2 className="text-sm font-semibold text-stone-200">Cuisine</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {cuisineLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1 text-xs font-medium text-stone-300"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!isEnriched && (
              <div className="rounded-xl border border-amber-800/30 bg-amber-950/20 p-5">
                <p className="text-xs font-semibold text-amber-300">This is a discovered listing</p>
                <p className="mt-1 text-xs text-amber-200/60">
                  Basic information only. If this is your business, claim it to add photos, a
                  description, menu link, and verified contact details.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {isEnriched && listing.address && (
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
                <h3 className="text-xs font-semibold text-stone-300">Address</h3>
                <p className="mt-1 text-sm text-stone-400">{listing.address}</p>
              </div>
            )}

            {isEnriched && listing.phone && (
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
                <h3 className="text-xs font-semibold text-stone-300">Phone</h3>
                <p className="mt-1 text-sm text-stone-400">{listing.phone}</p>
              </div>
            )}

            {isEnriched && listing.email && (
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
                <h3 className="text-xs font-semibold text-stone-300">Email</h3>
                <p className="mt-1 text-sm text-stone-400">{listing.email}</p>
              </div>
            )}

            {isEnriched && listing.hours && (
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
                <h3 className="text-xs font-semibold text-stone-300">Hours</h3>
                <div className="mt-2 space-y-1">
                  {Object.entries(listing.hours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between text-xs">
                      <span className="text-stone-400">{day}</span>
                      <span className="text-stone-300">{hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Claim / Remove actions */}
            <ClaimRemoveActions listingId={listing.id} status={listing.status} />
          </div>
        </div>
      </div>
    </div>
  )
}
