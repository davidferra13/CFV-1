import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getAccountLocation } from '@/lib/location/account-location'
import { getDirectoryListings, type DirectoryListingSummary } from '@/lib/discover/actions'
import { getBusinessTypeCollectionLabel, getStateName } from '@/lib/discover/constants'
import { DEFAULT_NEARBY_RADIUS_MILES } from '@/lib/discover/nearby-search'
import Link from 'next/link'

// Business types that represent "local food experiences" for this page.
const LOCAL_EXPERIENCE_TYPES = [
  'food_truck',
  'bakery',
  'pop_up',
  'supper_club',
  'restaurant',
  'caterer',
] as const

type SectionData = {
  businessType: string
  label: string
  listings: DirectoryListingSummary[]
}

async function loadLocalSections(
  lat: number | null,
  lng: number | null,
  radiusMiles: number,
  state: string | null
): Promise<SectionData[]> {
  const sections = await Promise.all(
    LOCAL_EXPERIENCE_TYPES.map(async (type) => {
      const filters: Parameters<typeof getDirectoryListings>[0] = {
        businessType: type,
        page: 1,
      }

      // If we have coordinates, do a proximity search
      if (lat != null && lng != null) {
        filters.userLat = lat
        filters.userLon = lng
        filters.radiusMiles = radiusMiles
      } else if (state) {
        // Fall back to state filtering
        filters.state = state
      }

      const result = await getDirectoryListings(filters)
      return {
        businessType: type,
        label: getBusinessTypeCollectionLabel(type),
        listings: result.listings.slice(0, 6),
      }
    })
  )

  // Only return sections that have results
  return sections.filter((s) => s.listings.length > 0)
}

function ListingCard({ listing }: { listing: DirectoryListingSummary }) {
  const locationParts: string[] = []
  if (listing.city) locationParts.push(listing.city)
  if (listing.state) locationParts.push(getStateName(listing.state))
  const locationLabel = locationParts.join(', ')

  return (
    <Link
      href={`/nearby/${listing.slug}`}
      className="rounded-xl border border-stone-800 bg-stone-900/50 p-5 transition-colors hover:border-stone-700 hover:bg-stone-900/80"
    >
      <h3 className="text-sm font-semibold text-stone-100 line-clamp-1">{listing.name}</h3>
      {locationLabel && <p className="mt-1 text-xs text-stone-400">{locationLabel}</p>}
      {listing.cuisine_types.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {listing.cuisine_types.slice(0, 3).map((cuisine: string) => (
            <span
              key={cuisine}
              className="rounded-full bg-stone-800 px-2 py-0.5 text-[11px] text-stone-400"
            >
              {cuisine}
            </span>
          ))}
        </div>
      )}
      {listing.price_range && (
        <p className="mt-2 text-xs text-amber-500/80">{listing.price_range}</p>
      )}
    </Link>
  )
}

function SectionBlock({ section }: { section: SectionData }) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-stone-100">{section.label}</h2>
        <Link
          href={`/nearby?type=${section.businessType}`}
          className="text-xs text-stone-500 transition-colors hover:text-stone-300"
        >
          View all
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {section.listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  )
}

export const metadata: Metadata = { title: 'Local Explore | ChefFlow' }

export default async function ExploreLocalPage() {
  const user = await requireChef()

  const location = await getAccountLocation(user.authUserId)
  const lat = location?.lat ?? null
  const lng = location?.lng ?? null
  const radiusMiles = location?.radiusMiles ?? DEFAULT_NEARBY_RADIUS_MILES
  const state = location?.state ?? null

  const locationLabel = location
    ? [location.city, location.state ? getStateName(location.state) : null]
        .filter(Boolean)
        .join(', ') || `ZIP ${location.zip}`
    : null

  const sections = await loadLocalSections(lat, lng, radiusMiles, state)

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold text-stone-100">Local Food</h1>
        <p className="mt-1 text-sm text-stone-400">
          {locationLabel
            ? `Food trucks, bakeries, pop-ups, and more near ${locationLabel}`
            : 'Nearby food experiences in your area'}
        </p>
        {!location && (
          <p className="mt-2 text-xs text-stone-500">
            Set your default location in{' '}
            <Link href="/settings" className="underline transition-colors hover:text-stone-300">
              Settings
            </Link>{' '}
            for better local results.
          </p>
        )}
      </header>

      {sections.length > 0 ? (
        sections.map((section) => <SectionBlock key={section.businessType} section={section} />)
      ) : (
        <div className="rounded-xl border border-stone-800 bg-stone-900/50 px-6 py-12 text-center">
          <p className="text-sm text-stone-400">No local food experiences found nearby.</p>
          {!location && (
            <p className="mt-2 text-xs text-stone-500">
              Try setting your location in{' '}
              <Link href="/settings" className="underline transition-colors hover:text-stone-300">
                Settings
              </Link>{' '}
              to see results in your area.
            </p>
          )}
          {location && (
            <p className="mt-2 text-xs text-stone-500">
              The directory is still growing. Check back as more local listings are added.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
