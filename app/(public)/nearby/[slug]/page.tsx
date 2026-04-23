import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/get-user'
import { getDirectoryListingBySlug } from '@/lib/discover/actions'
import { getBusinessTypeLabel, getCuisineLabel } from '@/lib/discover/constants'
import {
  getDirectoryListingTrust,
  isDirectoryListingIndexable,
  parseDirectoryListingHours,
  type DirectoryFieldTrust,
} from '@/lib/discover/trust'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'
import { ClaimRemoveActions } from './_components/claim-remove-actions'
import { CategoryPlaceholder } from '../_components/category-icon'
import {
  DirectoryFavoriteButton,
  type DirectoryFavoriteMode,
} from '../_components/directory-favorite-button'

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

function trustChipClasses(tone: DirectoryFieldTrust['tone']) {
  if (tone === 'verified') {
    return 'bg-emerald-950 text-emerald-300 ring-emerald-500/20'
  }

  if (tone === 'claimed') {
    return 'bg-blue-950 text-blue-300 ring-blue-500/20'
  }

  if (tone === 'warning') {
    return 'bg-amber-950 text-amber-300 ring-amber-500/20'
  }

  if (tone === 'muted') {
    return 'bg-stone-950 text-stone-400 ring-stone-700/40'
  }

  return 'bg-stone-900 text-stone-300 ring-stone-700/60'
}

function TrustChip({ trust }: { trust: DirectoryFieldTrust }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${trustChipClasses(trust.tone)}`}
    >
      {trust.badge}
    </span>
  )
}

function ListingStatusBadge({ status }: { status: string }) {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-950 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
        Verified
      </span>
    )
  }

  if (status === 'claimed') {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-950 px-2.5 py-0.5 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20">
        Claimed
      </span>
    )
  }

  if (status === 'pending_submission') {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-950 px-2.5 py-0.5 text-xs font-medium text-amber-300 ring-1 ring-inset ring-amber-500/20">
        Submitted
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-full bg-stone-900 px-2.5 py-0.5 text-xs font-medium text-stone-300 ring-1 ring-inset ring-stone-700/60">
      Listed
    </span>
  )
}

function FieldHeader({ title, trust }: { title: string; trust: DirectoryFieldTrust | null }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h3 className="text-xs font-semibold text-stone-300">{title}</h3>
      {trust ? <TrustChip trust={trust} /> : null}
    </div>
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getDirectoryListingBySlug(params.slug)
  if (!listing) return { title: 'Listing Not Found' }

  const location = [listing.city, listing.state].filter(Boolean).join(', ')
  const indexable = isDirectoryListingIndexable(listing)

  return {
    title: `${listing.name}${location ? ` - ${location}` : ''} | Nearby`,
    description:
      listing.description ||
      `${listing.name} is a ${getBusinessTypeLabel(listing.business_type)}${location ? ` in ${location}` : ''}.`,
    robots: { index: indexable, follow: indexable },
  }
}

export default async function ListingDetailPage({ params }: Props) {
  const user = await getCurrentUser()
  const favoriteMode: DirectoryFavoriteMode =
    user?.role === 'client' ? 'active' : user ? 'hidden' : 'signin'
  const listing = await getDirectoryListingBySlug(params.slug, {
    includeViewerState: favoriteMode === 'active',
  })

  if (!listing) {
    notFound()
  }

  const location = [listing.city && listing.city !== 'unknown' ? listing.city : null, listing.state]
    .filter(Boolean)
    .join(', ')
  const cuisineLabels = listing.cuisine_types.filter((c) => c !== 'other').map(getCuisineLabel)
  const trust = getDirectoryListingTrust(listing)
  const parsedHours = parseDirectoryListingHours(listing.hours)
  const indexable = trust.shouldIndex
  const hasPhotos = listing.photo_urls.length > 0
  const showMenuLink = Boolean(listing.menu_url && !trust.menu?.suppress)
  const showContactCard = Boolean(listing.phone || listing.email || listing.website_url)
  const showWebsiteInContactCard = Boolean(listing.website_url && !listing.phone && !listing.email)

  return (
    <div className="min-h-screen">
      {indexable ? <ListingJsonLd listing={listing} /> : null}

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
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-stone-100 md:text-3xl">{listing.name}</h1>
              <ListingStatusBadge status={listing.status} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-stone-400">
              <span className="rounded-full bg-stone-800 px-2.5 py-0.5 text-xs font-medium">
                {getBusinessTypeLabel(listing.business_type)}
              </span>
              {location ? <span>{location}</span> : null}
              {listing.price_range ? (
                <span className="font-semibold text-stone-300">{listing.price_range}</span>
              ) : null}
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-400">
              {trust.status.evidence}
            </p>
          </div>

          <div className="flex w-full max-w-sm flex-col gap-2 sm:w-auto sm:items-end">
            <div className="flex flex-wrap gap-2">
              <DirectoryFavoriteButton
                listingId={listing.id}
                listingName={listing.name}
                initialFavorited={listing.is_favorited}
                mode={favoriteMode}
                variant="detail"
              />
              {listing.website_url ? (
                <a
                  href={listing.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Visit website
                </a>
              ) : null}
              {showMenuLink ? (
                <a
                  href={listing.menu_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-stone-700 px-5 py-2.5 text-sm font-medium text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100"
                >
                  View menu
                </a>
              ) : null}
            </div>
            {trust.menu ? (
              <div className="rounded-xl border border-stone-800/80 bg-stone-950/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                    Menu
                  </p>
                  <TrustChip trust={trust.menu} />
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500">
                  {trust.menu.evidence}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-200">Photos</h2>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">{trust.photos.evidence}</p>
          </div>
          <TrustChip trust={trust.photos} />
        </div>

        {hasPhotos ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="mt-3 aspect-[3/1] max-h-48 overflow-hidden rounded-xl">
            <CategoryPlaceholder businessType={listing.business_type} name={listing.name} />
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {listing.description ? (
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-5">
                <h2 className="text-sm font-semibold text-stone-200">About</h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-400">{listing.description}</p>
              </div>
            ) : null}

            {cuisineLabels.length > 0 ? (
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
            ) : null}

            {listing.linked_chef ? (
              <div className="rounded-xl border border-sky-900/40 bg-sky-950/20 p-5">
                <h2 className="text-sm font-semibold text-stone-100">Linked ChefFlow Profile</h2>
                <p className="mt-1.5 text-sm text-stone-300">
                  This Nearby listing is linked to the operator&apos;s live ChefFlow chef profile.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/chef/${listing.linked_chef.slug}`}
                    className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-500"
                  >
                    View {listing.linked_chef.display_name}
                  </Link>
                  <Link
                    href="/chefs"
                    className="rounded-lg border border-stone-700 px-4 py-2 text-xs font-medium text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100"
                  >
                    Browse Chef Profiles
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-amber-800/30 bg-amber-950/10 p-5">
              <h2 className="text-sm font-semibold text-stone-200">Planning a group meal?</h2>
              <p className="mt-1.5 text-sm text-stone-400">
                Start a Dinner Circle to gather friends, coordinate the details, and keep everyone
                on the same page.
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

          <div className="space-y-4">
            {listing.address ? (
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
                <h3 className="text-xs font-semibold text-stone-300">Address</h3>
                <p className="mt-1 text-sm text-stone-400">
                  {listing.address}
                  {location ? `, ${location}` : ''}
                </p>
                {listing.lat && listing.lon ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${listing.lat},${listing.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs font-medium text-brand-400 transition-colors hover:text-brand-300"
                  >
                    View on Google Maps
                  </a>
                ) : null}
              </div>
            ) : null}

            {!listing.address && listing.lat && listing.lon ? (
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
                <h3 className="text-xs font-semibold text-stone-300">Location</h3>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${listing.lat},${listing.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs font-medium text-brand-400 transition-colors hover:text-brand-300"
                >
                  View on Google Maps
                </a>
              </div>
            ) : null}

            {showContactCard ? (
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
                <FieldHeader title="Contact" trust={trust.contact} />
                {trust.contact ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
                    {trust.contact.evidence}
                  </p>
                ) : null}
                <div className="mt-3 space-y-2">
                  {listing.phone ? (
                    <a
                      href={`tel:${listing.phone}`}
                      className="block text-sm text-brand-400 transition-colors hover:text-brand-300"
                    >
                      {listing.phone}
                    </a>
                  ) : null}
                  {listing.email ? (
                    <a
                      href={`mailto:${listing.email}`}
                      className="block text-sm text-brand-400 transition-colors hover:text-brand-300"
                    >
                      {listing.email}
                    </a>
                  ) : null}
                  {showWebsiteInContactCard ? (
                    <a
                      href={listing.website_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-brand-400 transition-colors hover:text-brand-300"
                    >
                      {listing.website_url}
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            {parsedHours && trust.hours ? (
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
                <FieldHeader title="Hours" trust={trust.hours} />
                <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
                  {trust.hours.evidence}
                </p>
                <div className="mt-3 space-y-1">
                  {parsedHours.kind === 'raw' ? (
                    <p className="whitespace-pre-line text-xs text-stone-400">{parsedHours.raw}</p>
                  ) : (
                    Object.entries(parsedHours.days).map(([day, value]) => (
                      <div key={day} className="flex justify-between gap-4 text-xs">
                        <span className="text-stone-400">{day}</span>
                        <span className="text-right text-stone-300">{value}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-stone-800/50 bg-stone-900/30 p-4">
              <h3 className="text-xs font-semibold text-stone-300">
                {listing.status === 'discovered' ? 'Own this business?' : 'Need a correction?'}
              </h3>
              <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
                {listing.status === 'discovered'
                  ? 'Claim the listing to replace public-source fields with owner-managed hours, menu links, photos, and contact details.'
                  : 'You can still request a correction or removal if something looks off.'}
              </p>
              <div className="mt-3">
                <ClaimRemoveActions
                  listingId={listing.id}
                  status={listing.status}
                  enhancePath={`/nearby/${listing.slug}/enhance`}
                />
              </div>
            </div>
          </div>
        </div>

        <PublicSecondaryEntryCluster
          links={PUBLIC_SECONDARY_ENTRY_CONFIG.nearby_detail}
          theme="dark"
        />
      </div>
    </div>
  )
}
