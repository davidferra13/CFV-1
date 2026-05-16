import { requireChef } from '@/lib/auth/get-user'
import { getAccountLocation } from '@/lib/location/account-location'
import {
  getDirectoryListings,
  resolveDirectoryLocationQuery,
  getDirectoryFacets,
  type DirectoryListingSummary,
} from '@/lib/discover/actions'
import { getBusinessTypeLabel } from '@/lib/discover/constants'
import { formatDistanceMiles } from '@/lib/discover/nearby-search'
import { createAdminClient } from '@/lib/db/admin'
import Link from 'next/link'
import { MapPin, Globe, Phone } from '@/components/ui/icons'

async function getChefLinkedListingId(chefId: string): Promise<string | null> {
  const db: any = createAdminClient()
  const { data } = await db
    .from('directory_listings')
    .select('id')
    .eq('linked_chef_id', chefId)
    .neq('status', 'removed')
    .limit(1)

  const rows = (data as Array<{ id: string }> | null) ?? []
  return rows[0]?.id ?? null
}

function ListingCard({ listing }: { listing: DirectoryListingSummary }) {
  const typeLabel = getBusinessTypeLabel(listing.business_type)
  const location = [listing.city, listing.state].filter(Boolean).join(', ')
  const distance = formatDistanceMiles(listing.distance_miles)

  return (
    <Link
      href={`/nearby/${listing.slug}`}
      className="group rounded-xl border border-stone-800 bg-stone-900/50 p-5 hover:border-stone-600 hover:bg-stone-900 transition-colors block"
    >
      {listing.photo_urls?.length > 0 && (
        <div className="mb-3 overflow-hidden rounded-lg">
          <img
            src={listing.photo_urls[0]}
            alt={listing.name}
            className="h-36 w-full object-cover group-hover:scale-105 transition-transform"
          />
        </div>
      )}
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-stone-100 group-hover:text-amber-400 transition-colors line-clamp-1">
            {listing.name}
          </h3>
          {listing.price_range && (
            <span className="text-xs text-stone-500 shrink-0">{listing.price_range}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-400">
          <span className="rounded-full bg-stone-800 px-2 py-0.5">{typeLabel}</span>
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {location}
            </span>
          )}
          {distance && <span className="text-stone-500">{distance}</span>}
        </div>
        {listing.cuisine_types?.length > 0 && (
          <p className="text-xs text-stone-500 line-clamp-1">
            {listing.cuisine_types.slice(0, 4).join(', ')}
          </p>
        )}
        {listing.description && (
          <p className="text-xs text-stone-500 line-clamp-2 mt-1">{listing.description}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-stone-600 pt-1">
          {listing.website_url && (
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              Website
            </span>
          )}
          {listing.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {listing.phone}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default async function ExploreDiscoverPage() {
  const user = await requireChef()

  // Get chef's saved location for proximity search
  const accountLocation = await getAccountLocation()
  let userLat: number | undefined
  let userLon: number | undefined
  let locationLabel = ''

  if (accountLocation?.zip) {
    const resolved = await resolveDirectoryLocationQuery(accountLocation.zip)
    if (resolved.data) {
      userLat = resolved.data.lat
      userLon = resolved.data.lon
      locationLabel = resolved.data.displayLabel
    }
  }

  // Find the chef's own linked listing so we can exclude it
  const ownListingId = await getChefLinkedListingId(user.entityId)

  // Fetch nearby listings
  const { listings: rawListings, total } = await getDirectoryListings({
    userLat,
    userLon,
    radiusMiles: accountLocation?.radiusMiles ?? 25,
  })

  // Filter out the chef's own listing
  const listings = ownListingId ? rawListings.filter((l) => l.id !== ownListingId) : rawListings

  // Fetch facets for display
  const facets = await getDirectoryFacets()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Discover</h1>
        <p className="text-stone-400 mt-1">Browse food, chefs, and experiences nearby</p>
        {locationLabel && (
          <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Showing results near {locationLabel}
          </p>
        )}
      </div>

      {/* Quick type filters */}
      {facets.businessTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {facets.businessTypes.slice(0, 8).map((bt) => (
            <span
              key={bt.value}
              className="rounded-full border border-stone-700 bg-stone-800/50 px-3 py-1 text-xs text-stone-300"
            >
              {getBusinessTypeLabel(bt.value)} <span className="text-stone-500">({bt.count})</span>
            </span>
          ))}
        </div>
      )}

      {/* Results grid */}
      {listings.length > 0 ? (
        <>
          <p className="text-sm text-stone-500">
            {total.toLocaleString()} listing{total === 1 ? '' : 's'} found
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-12 text-center">
          <p className="text-stone-400 text-lg mb-2">No listings found nearby</p>
          <p className="text-stone-500 text-sm">
            {accountLocation?.zip
              ? 'Try expanding your search radius or check back later as more operators join.'
              : 'Set your default location in settings to see nearby results.'}
          </p>
        </div>
      )}
    </div>
  )
}
