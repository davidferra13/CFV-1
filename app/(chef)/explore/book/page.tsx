import Image from 'next/image'
import { requireChef } from '@/lib/auth/get-user'
import { getDiscoverableChefs, type DirectoryChef } from '@/lib/directory/actions'
import Link from 'next/link'
import { Users, Star, MapPin, ExternalLink } from '@/components/ui/icons'

export const metadata = {
  title: 'Book a Chef',
}

function formatPriceRange(chef: DirectoryChef): string | null {
  const pr = chef.discovery.price_range
  if (pr) return pr
  return null
}

function formatCuisines(chef: DirectoryChef): string {
  const cuisines = chef.discovery.cuisine_types ?? []
  if (cuisines.length === 0) return 'Various cuisines'
  if (cuisines.length <= 3) return cuisines.join(', ')
  return cuisines.slice(0, 3).join(', ') + ` +${cuisines.length - 3} more`
}

function formatLocation(chef: DirectoryChef): string | null {
  const city = chef.discovery.service_area_city
  const state = chef.discovery.service_area_state
  if (city && state) return `${city}, ${state}`
  if (state) return state
  if (city) return city
  // Fallback to directory listing location
  if (chef.directory_listing_location) {
    const dl = chef.directory_listing_location
    if (dl.city && dl.state) return `${dl.city}, ${dl.state}`
    if (dl.state) return dl.state
  }
  return null
}

function getBookingAction(chef: DirectoryChef): { href: string; label: string } {
  if (chef.booking_enabled && chef.booking_slug) {
    if (chef.booking_model === 'instant_book') {
      return { href: `/chef/${chef.slug}`, label: 'Instant Book' }
    }
    return { href: `/chef/${chef.slug}/inquire`, label: 'Request Quote' }
  }
  return { href: `/chef/${chef.slug}/inquire`, label: 'Send Inquiry' }
}

export default async function ExploreBookPage() {
  const user = await requireChef()

  const allChefs = await getDiscoverableChefs()

  // Filter out the current user so they cannot book themselves
  const chefs = allChefs.filter((chef) => chef.id !== user.entityId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Book a Chef</h1>
        <p className="text-stone-400 mt-1">Find and hire a chef for your next occasion</p>
      </div>

      {chefs.length === 0 ? (
        <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-12 text-center">
          <Users className="h-12 w-12 text-stone-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-stone-300 mb-2">No chefs available yet</h2>
          <p className="text-sm text-stone-500 max-w-md mx-auto">
            Other chefs on the platform will appear here once they enable their public profiles.
            Check back soon.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-stone-500">
            {chefs.length} chef{chefs.length === 1 ? '' : 's'} available
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {chefs.map((chef) => {
              const location = formatLocation(chef)
              const cuisines = formatCuisines(chef)
              const priceRange = formatPriceRange(chef)
              const action = getBookingAction(chef)
              const rating = chef.discovery.avg_rating
              const reviewCount = chef.discovery.review_count ?? 0

              return (
                <div
                  key={chef.id}
                  className="rounded-xl border border-stone-800 bg-stone-900/50 p-6 flex flex-col"
                >
                  {/* Header: photo + name */}
                  <div className="flex items-start gap-4 mb-4">
                    {chef.profile_image_url ? (
                      <Image
                        src={chef.profile_image_url}
                        alt={chef.display_name}
                        width={56}
                        height={56}
                        sizes="56px"
                        unoptimized
                        className="h-14 w-14 rounded-full object-cover border border-stone-700 shrink-0"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center shrink-0">
                        <Users className="h-6 w-6 text-stone-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-stone-100 truncate">
                        {chef.display_name}
                      </h3>
                      {chef.tagline && (
                        <p className="text-sm text-stone-400 line-clamp-1">{chef.tagline}</p>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mb-4 flex-1">
                    <p className="text-sm text-stone-400">{cuisines}</p>

                    {location && (
                      <div className="flex items-center gap-1.5 text-sm text-stone-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>{location}</span>
                      </div>
                    )}

                    {rating != null && reviewCount > 0 && (
                      <div className="flex items-center gap-1.5 text-sm text-stone-400">
                        <Star className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span>
                          {rating.toFixed(1)} ({reviewCount} review
                          {reviewCount === 1 ? '' : 's'})
                        </span>
                      </div>
                    )}

                    {priceRange && <p className="text-sm text-stone-500">{priceRange}</p>}

                    {chef.discovery.service_types.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {chef.discovery.service_types.slice(0, 4).map((st) => (
                          <span
                            key={st}
                            className="text-xs bg-stone-800 text-stone-400 rounded px-2 py-0.5"
                          >
                            {st}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-auto pt-2 border-t border-stone-800">
                    <Link
                      href={`/chef/${chef.slug}`}
                      className="text-sm text-stone-400 hover:text-stone-200 transition-colors flex items-center gap-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Profile
                    </Link>
                    <Link
                      href={action.href}
                      className="ml-auto bg-amber-500 hover:bg-amber-400 text-stone-900 font-medium rounded-lg px-4 py-2 text-sm transition-colors"
                    >
                      {action.label}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
