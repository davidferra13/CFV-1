import Link from 'next/link'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { CloudinaryFetchImage } from '@/components/ui/cloudinary-fetch-image'
import {
  MapPin,
  DollarSign,
  Users,
  Utensils,
  CookingPot,
  BowlFood,
  Sparkles,
} from '@/components/ui/icons'
import {
  getDiscoveryPriceRangeLabel,
  getDiscoveryServiceTypeLabel,
} from '@/lib/discovery/constants'
import { getDiscoveryAvailabilityLabel, getDiscoveryGuestCountLabel } from '@/lib/discovery/profile'
import { getChefCoverage } from '@/lib/directory/utils'
import type { DirectoryChef } from '@/lib/directory/actions'

const SERVICE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  private_dinner: Utensils,
  catering: CookingPot,
  meal_prep: BowlFood,
  event_chef: Sparkles,
}

type ChefCardProps = {
  chef: DirectoryChef
}

export function ChefCard({ chef }: ChefCardProps) {
  const heroImage = chef.discovery.hero_image_url || chef.profile_image_url
  const availabilityLabel = getDiscoveryAvailabilityLabel(chef.discovery)
  const guestCountLabel = getDiscoveryGuestCountLabel(chef.discovery)
  const coverage = getChefCoverage(chef)
  const priceRangeLabel = chef.discovery.price_range
    ? getDiscoveryPriceRangeLabel(chef.discovery.price_range)
    : null
  const distanceLabel = typeof chef.distance_miles === 'number' ? `${chef.distance_miles} mi` : null

  const hasInstantBook = chef.booking_enabled && chef.booking_slug
  const primaryHref = hasInstantBook
    ? `/book/${chef.booking_slug}`
    : chef.discovery.accepting_inquiries
      ? `/chef/${chef.slug}/inquire`
      : `/chef/${chef.slug}`
  const primaryLabel = hasInstantBook
    ? chef.booking_model === 'instant_book'
      ? 'Book instantly'
      : 'Book now'
    : chef.discovery.accepting_inquiries
      ? 'Inquire'
      : 'View profile'
  const primaryStyle =
    hasInstantBook || chef.discovery.accepting_inquiries
      ? 'bg-brand-600 text-white hover:bg-brand-700'
      : 'border border-stone-700 text-stone-300 hover:bg-stone-800 hover:text-stone-100'

  const serviceTypes = chef.discovery.service_types.slice(0, 3)

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-stone-900 ring-1 ring-stone-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgb(0,0,0,0.25)] hover:ring-brand-600">
      {/* Image */}
      <Link
        href={`/chef/${chef.slug}`}
        className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-brand-950 to-stone-900"
      >
        {heroImage ? (
          <CloudinaryFetchImage
            src={heroImage}
            alt={chef.display_name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            aspectRatio={3 / 4}
            fit="fill"
            gravity="auto"
            defaultQuality={90}
            maxWidth={800}
            quality={90}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-950 to-stone-900">
            <span className="font-display text-7xl text-brand-300/60">
              {chef.display_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Badges */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-sm ${
              chef.discovery.accepting_inquiries
                ? 'bg-black/50 text-emerald-300'
                : 'bg-black/50 text-amber-300'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                chef.discovery.accepting_inquiries ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            {availabilityLabel}
          </span>

          {chef.booking_enabled && chef.booking_slug && chef.booking_model === 'instant_book' && (
            <span className="rounded-full bg-emerald-600/90 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              Instant Book
            </span>
          )}
        </div>

        {/* Name overlay */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h2 className="text-lg font-bold text-white drop-shadow-sm">{chef.display_name}</h2>
          {chef.tagline && (
            <p className="mt-0.5 truncate text-sm text-white/75 drop-shadow-sm">{chef.tagline}</p>
          )}
        </div>
      </Link>

      {/* Details */}
      <div className="flex flex-1 flex-col p-4">
        {/* Info row with icons */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-400">
          {distanceLabel ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-stone-500" />
              {distanceLabel}
            </span>
          ) : coverage.length > 0 ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-stone-500" />
              {coverage.slice(0, 2).join(', ')}
              {coverage.length > 2 ? ` +${coverage.length - 2}` : ''}
            </span>
          ) : null}
          {priceRangeLabel && (
            <span className="inline-flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-stone-500" />
              {priceRangeLabel}
            </span>
          )}
          {guestCountLabel && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-stone-500" />
              {guestCountLabel}
            </span>
          )}
        </div>

        {/* Service type icons */}
        {serviceTypes.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            {serviceTypes.map((type) => {
              const Icon = SERVICE_ICON_MAP[type] ?? Utensils
              const label = getDiscoveryServiceTypeLabel(type)
              return (
                <span
                  key={type}
                  title={label}
                  className="inline-flex items-center gap-1 rounded-full border border-stone-800 bg-stone-950 px-2 py-0.5 text-[11px] text-stone-400"
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </span>
              )
            })}
          </div>
        )}

        <div className="flex-1" />

        {/* Single CTA */}
        <TrackedLink
          href={primaryHref}
          analyticsName={
            hasInstantBook
              ? 'directory_instant_book'
              : chef.discovery.accepting_inquiries
                ? 'directory_inquire'
                : 'directory_view_profile'
          }
          analyticsProps={{
            chef_slug: chef.slug,
            accepting_inquiries: chef.discovery.accepting_inquiries,
            booking_enabled: chef.booking_enabled,
          }}
          className={`mt-4 block rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-all active:scale-[0.98] ${primaryStyle}`}
        >
          {primaryLabel}
        </TrackedLink>
      </div>
    </article>
  )
}
