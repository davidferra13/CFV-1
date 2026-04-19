import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDirectoryListingBySlug } from '@/lib/discover/actions'
import { getBusinessTypeLabel, getCuisineLabel } from '@/lib/discover/constants'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'
// import { ClaimRemoveActions } from './_components/claim-remove-actions' // Hidden until directory is public
import { CategoryPlaceholder } from '../_components/category-icon'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

function schemaType(businessType: string): string {
  if (businessType === 'restaurant') return 'Restaurant'
  if (businessType === 'bakery') return 'Bakery'
  return 'FoodEstablishment'
}

function ListingJsonLd({ listing }: { listing: any }) {
  const jsonLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': schemaType(listing.business_type),
    name: listing.name,
    url: `${APP_URL}/nearby/${listing.slug}`,
  }

  const addressParts: Record<string, string> = {}
  if (listing.address) addressParts.streetAddress = listing.address
  if (listing.city) addressParts.addressLocality = listing.city
  if (listing.state) addressParts.addressRegion = listing.state
  if (listing.postcode) addressParts.postalCode = listing.postcode
  if (Object.keys(addressParts).length > 0) {
    jsonLd.address = { '@type': 'PostalAddress', ...addressParts }
  }

  if (listing.lat && listing.lon) {
    jsonLd.geo = {
      '@type': 'GeoCoordinates',
      latitude: listing.lat,
      longitude: listing.lon,
    }
  }

  if (listing.phone) jsonLd.telephone = listing.phone
  if (listing.email) jsonLd.email = listing.email
  if (listing.price_range) jsonLd.priceRange = listing.price_range

  if (listing.cuisine_types?.length > 0) {
    jsonLd.servesCuisine = listing.cuisine_types.map(getCuisineLabel)
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

type Props = {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getDirectoryListingBySlug(params.slug)
  if (!listing) return { title: 'Listing Not Found' }

  const location = [listing.city, listing.state].filter(Boolean).join(', ')
  return {
    title: `${listing.name}${location ? ` - ${location}` : ''} | Nearby`,
    description:
      listing.description ||
      `${listing.name} is a ${getBusinessTypeLabel(listing.business_type)}${location ? ` in ${location}` : ''}.`,
    robots: { index: false, follow: false },
  }
}

export default async function ListingDetailPage({ params }: Props) {
  const listing = await getDirectoryListingBySlug(params.slug)

  if (!listing) {
    notFound()
  }

  const location = [listing.city && listing.city !== 'unknown' ? listing.city : null, listing.state]
    .filter(Boolean)
    .join(', ')
  const cuisineLabels = listing.cuisine_types.filter((c) => c !== 'other').map(getCuisineLabel)
  const hasPhotos = listing.photo_urls.length > 0

  return (
    <div className="min-h-screen">
      <ListingJsonLd listing={listing} />
      {/* Back nav */}
      <div className="border-b border-stone-800/50">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/nearby"
            className="text-sm text-stone-400 transition-colors hover:text-stone-200"
          >
            &larr; Back to Nearby
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-stone-100 md:text-3xl">{listing.name}</h1>
              {listing.status === 'verified' ? (
                <span className="inline-flex items-center rounded-full bg-emerald-950 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                  Verified
                </span>
              ) : listing.status === 'claimed' ? (
                <span className="inline-flex items-center rounded-full bg-blue-950 px-2.5 py-0.5 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20">
                  Claimed
                </span>
              ) : null}
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

        {/* Photo gallery or gradient placeholder */}
        {hasPhotos ? (
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
        ) : (
          <div className="mt-8 aspect-[3/1] max-h-48 overflow-hidden rounded-xl">
            <CategoryPlaceholder businessType={listing.business_type} name={listing.name} />
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

            {/* Dinner Circle CTA */}
            <div className="rounded-xl border border-amber-800/30 bg-amber-950/10 p-5">
              <h2 className="text-sm font-semibold text-stone-200">Planning a group meal?</h2>
              <p className="mt-1.5 text-sm text-stone-400">
                Start a Dinner Circle to gather friends, coordinate the details, and keep everyone on
                the same page.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/hub/circles"
                  className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-500"
                >
                  Browse Circles
                </Link>
                <Link
                  href="/hub"
                  className="rounded-lg border border-stone-700 px-4 py-2 text-xs font-medium text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100"
                >
                  What are Dinner Circles?
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {listing.address && (
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
                <h3 className="text-xs font-semibold text-stone-300">Address</h3>
                <p className="mt-1 text-sm text-stone-400">
                  {listing.address}
                  {location && `, ${location}`}
                </p>
                {listing.lat && listing.lon && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${listing.lat},${listing.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    View on Google Maps
                  </a>
                )}
              </div>
            )}

            {!listing.address && listing.lat && listing.lon && (
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
                <h3 className="text-xs font-semibold text-stone-300">Location</h3>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${listing.lat},${listing.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
                >
                  View on Google Maps
                </a>
              </div>
            )}

            {listing.phone && (
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
                <h3 className="text-xs font-semibold text-stone-300">Phone</h3>
                <a
                  href={`tel:${listing.phone}`}
                  className="mt-1 block text-sm text-brand-400 hover:text-brand-300 transition-colors"
                >
                  {listing.phone}
                </a>
              </div>
            )}

            {listing.email && (
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
                <h3 className="text-xs font-semibold text-stone-300">Email</h3>
                <a
                  href={`mailto:${listing.email}`}
                  className="mt-1 block text-sm text-brand-400 hover:text-brand-300 transition-colors"
                >
                  {listing.email}
                </a>
              </div>
            )}

            {listing.hours &&
              (() => {
                const hours =
                  typeof listing.hours === 'string' ? JSON.parse(listing.hours) : listing.hours
                return (
                  <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
                    <h3 className="text-xs font-semibold text-stone-300">Hours</h3>
                    <div className="mt-2 space-y-1">
                      {typeof hours === 'object' && 'raw' in hours ? (
                        <p className="text-xs text-stone-400 whitespace-pre-line">
                          {(hours as { raw: string }).raw}
                        </p>
                      ) : (
                        Object.entries(hours).map(([day, h]) => (
                          <div key={day} className="flex justify-between text-xs">
                            <span className="text-stone-400">{day}</span>
                            <span className="text-stone-300">{h as string}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })()}

            {/* Data confidence indicator */}
            <div className="rounded-xl border border-stone-800/50 bg-stone-900/30 p-4">
              <p className="text-[11px] text-stone-500">
                {listing.status === 'verified'
                  ? 'This listing has been verified by the business owner.'
                  : listing.status === 'claimed'
                    ? 'This listing has been claimed by the business owner but is not yet verified.'
                    : 'This listing was created from public data sources. Details may not be current.'}
              </p>
              {listing.status !== 'verified' && listing.status !== 'claimed' && (
                <Link
                  href={`/nearby/submit`}
                  className="mt-2 inline-block text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Is this your business? Claim it
                </Link>
              )}
            </div>
          </div>
        </div>

        <PublicSecondaryEntryCluster links={PUBLIC_SECONDARY_ENTRY_CONFIG.nearby_detail} theme="dark" />
      </div>
    </div>
  )
}
