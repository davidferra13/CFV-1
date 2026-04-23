import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { LocationExperienceShowcase } from '@/components/public/location-experience-showcase'
import { MapPin, Users, ExternalLink } from '@/components/ui/icons'
import { getPublicChefProfile } from '@/lib/profile/actions'
import {
  CHEF_LOCATION_RELATIONSHIP_LABELS,
  LOCATION_BEST_FOR_LABELS,
  LOCATION_EXPERIENCE_TAG_LABELS,
  LOCATION_SERVICE_TYPE_LABELS,
} from '@/lib/partners/location-experiences'

type Props = {
  params: {
    slug: string
    locationId: string
  }
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPublicChefProfile(params.slug)
  const location = data?.locationExperiences.find((item) => item.id === params.locationId) ?? null

  if (!data || !location) {
    return { title: 'Setting Not Found' }
  }

  const publicSlug = data.chef.public_slug || params.slug
  const cityState = [location.city, location.state].filter(Boolean).join(', ')
  const title = `${location.name} with ${data.chef.display_name}`
  const description =
    location.description ||
    `Published setting for ${data.chef.display_name}${cityState ? ` in ${cityState}` : ''}.`

  return {
    title,
    description,
    alternates: {
      canonical: `${APP_URL}/chef/${publicSlug}/locations/${location.id}`,
    },
    openGraph: {
      title,
      description,
      url: `${APP_URL}/chef/${publicSlug}/locations/${location.id}`,
      type: 'website',
      ...(location.images[0]?.image_url ? { images: [location.images[0].image_url] } : {}),
    },
    twitter: {
      card: location.images[0]?.image_url ? 'summary_large_image' : 'summary',
      title,
      description,
    },
  }
}

function DetailChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-stone-700 bg-stone-900/80 px-3 py-1 text-xs font-medium text-stone-200">
      {label}
    </span>
  )
}

export default async function PublicLocationPage({ params }: Props) {
  const data = await getPublicChefProfile(params.slug)
  if (!data) notFound()

  const { chef, locationExperiences } = data
  const location = locationExperiences.find((item) => item.id === params.locationId) ?? null

  if (!location) notFound()

  const publicSlug = chef.public_slug || params.slug
  const cityState = [location.city, location.state].filter(Boolean).join(', ')
  const inquiryHref = `/chef/${publicSlug}/locations/${location.id}/inquire`
  const bookingHref = location.booking_url
    ? `/chef/${publicSlug}/locations/${location.id}/book`
    : null
  const otherLocations = locationExperiences.filter((item) => item.id !== location.id).slice(0, 3)

  return (
    <div className="min-h-screen bg-stone-950">
      <section className="border-b border-stone-900 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_transparent_50%),linear-gradient(180deg,_rgba(28,25,23,0.98),_rgba(12,10,9,1))]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <Link
            href={`/chef/${publicSlug}`}
            className="text-sm text-stone-400 transition-colors hover:text-stone-200"
          >
            Back to {chef.display_name}
          </Link>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
                Published setting
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-50">
                {location.name}
              </h1>
              <p className="mt-3 text-lg text-stone-300">
                {location.partner.name}
                {cityState ? ` · ${cityState}` : ''}
              </p>
              {location.description && (
                <p className="mt-4 max-w-3xl text-base leading-7 text-stone-300">
                  {location.description}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                <DetailChip label={CHEF_LOCATION_RELATIONSHIP_LABELS[location.relationship_type]} />
                {cityState ? <DetailChip label={cityState} /> : null}
                {location.max_guest_count ? (
                  <DetailChip label={`Up to ${location.max_guest_count} guests`} />
                ) : null}
                <DetailChip
                  label={`${location.images.length} photo${location.images.length === 1 ? '' : 's'}`}
                />
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-stone-800 bg-stone-900/80 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Book this setting
              </p>
              <p className="mt-3 text-sm leading-6 text-stone-300">
                Start the inquiry with the setting already attached so ChefFlow can preserve venue,
                inquiry, and revenue attribution end to end.
              </p>

              <div className="mt-5 space-y-3">
                <TrackedLink
                  href={inquiryHref}
                  analyticsName="public_location_page_inquiry"
                  analyticsProps={{
                    chef_slug: publicSlug,
                    location_id: location.id,
                    partner_id: location.partner.id,
                  }}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-400"
                >
                  Ask {chef.display_name} About This Setting
                </TrackedLink>
                {bookingHref ? (
                  <TrackedLink
                    href={bookingHref}
                    analyticsName="public_location_page_booking"
                    analyticsProps={{
                      chef_slug: publicSlug,
                      location_id: location.id,
                      partner_id: location.partner.id,
                    }}
                    prefetch={false}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-700 px-4 py-3 text-sm font-semibold text-stone-100 transition hover:bg-stone-900"
                  >
                    View Venue Booking
                    <ExternalLink className="h-4 w-4" />
                  </TrackedLink>
                ) : null}
                <TrackedLink
                  href={`/chef/${publicSlug}`}
                  analyticsName="public_location_page_profile"
                  analyticsProps={{ chef_slug: publicSlug, location_id: location.id }}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-stone-800 px-4 py-3 text-sm font-medium text-stone-300 transition hover:border-stone-700 hover:bg-stone-900"
                >
                  View Chef Profile
                </TrackedLink>
              </div>

              <div className="mt-6 space-y-3 border-t border-stone-800 pt-6 text-sm text-stone-300">
                {cityState ? (
                  <p className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-stone-500" />
                    {cityState}
                  </p>
                ) : null}
                {location.max_guest_count ? (
                  <p className="inline-flex items-center gap-2">
                    <Users className="h-4 w-4 text-stone-500" />
                    Up to {location.max_guest_count} guests
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <LocationExperienceShowcase
          locations={[location]}
          chefName={chef.display_name}
          profileSlug={publicSlug}
          showLocationPageCta={false}
        />
      </section>

      {(location.best_for.length > 0 ||
        location.service_types.length > 0 ||
        location.experience_tags.length > 0) && (
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {location.best_for.length > 0 && (
              <div className="rounded-[1.5rem] border border-stone-800 bg-stone-900/80 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Best for
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {location.best_for.map((value) => (
                    <DetailChip key={value} label={LOCATION_BEST_FOR_LABELS[value]} />
                  ))}
                </div>
              </div>
            )}
            {location.service_types.length > 0 && (
              <div className="rounded-[1.5rem] border border-stone-800 bg-stone-900/80 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Formats
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {location.service_types.map((value) => (
                    <DetailChip key={value} label={LOCATION_SERVICE_TYPE_LABELS[value]} />
                  ))}
                </div>
              </div>
            )}
            {location.experience_tags.length > 0 && (
              <div className="rounded-[1.5rem] border border-stone-800 bg-stone-900/80 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Gallery tags
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {location.experience_tags.map((value) => (
                    <DetailChip key={value} label={LOCATION_EXPERIENCE_TAG_LABELS[value]} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {otherLocations.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-[1.75rem] border border-stone-800 bg-stone-900/80 p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  More published settings
                </p>
                <h2 className="mt-2 text-2xl font-bold text-stone-50">
                  Other settings with {chef.display_name}
                </h2>
              </div>
              <Link
                href={`/chef/${publicSlug}`}
                className="text-sm font-medium text-brand-300 transition-colors hover:text-brand-200"
              >
                View full chef profile
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {otherLocations.map((item) => (
                <Link
                  key={item.id}
                  href={`/chef/${publicSlug}/locations/${item.id}`}
                  className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4 transition hover:border-stone-700 hover:bg-stone-950"
                >
                  <p className="text-sm font-semibold text-stone-100">{item.name}</p>
                  <p className="mt-1 text-xs text-stone-400">
                    {item.partner.name}
                    {[item.city, item.state].filter(Boolean).length > 0
                      ? ` · ${[item.city, item.state].filter(Boolean).join(', ')}`
                      : ''}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
