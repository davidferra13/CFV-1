'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { ExternalLink, MapPin, Users } from '@/components/ui/icons'
import {
  CHEF_LOCATION_RELATIONSHIP_LABELS,
  LOCATION_BEST_FOR_LABELS,
  LOCATION_EXPERIENCE_TAG_LABELS,
  LOCATION_SERVICE_TYPE_LABELS,
  type PublicChefLocationExperience,
} from '@/lib/partners/location-experiences'

type Props = {
  locations: PublicChefLocationExperience[]
  chefName: string
  profileSlug: string
  showLocationPageCta?: boolean
}

function Chip({ label, tone = 'default' }: { label: string; tone?: 'default' | 'warm' }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
        tone === 'warm'
          ? 'border-amber-700/60 bg-amber-500/10 text-amber-100'
          : 'border-stone-700 bg-stone-950/80 text-stone-200',
      ].join(' ')}
    >
      {label}
    </span>
  )
}

export function LocationExperienceShowcase({
  locations,
  chefName,
  profileSlug,
  showLocationPageCta = true,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
      {locations.map((location) => (
        <LocationExperienceCard
          key={location.id}
          location={location}
          chefName={chefName}
          profileSlug={profileSlug}
          showLocationPageCta={showLocationPageCta}
        />
      ))}
    </div>
  )
}

function LocationExperienceCard({
  location,
  chefName,
  profileSlug,
  showLocationPageCta,
}: {
  location: PublicChefLocationExperience
  chefName: string
  profileSlug: string
  showLocationPageCta: boolean
}) {
  const [imageIndex, setImageIndex] = useState(0)
  const activeImage = location.images[imageIndex] ?? location.images[0] ?? null
  const cityState = [location.city, location.state].filter(Boolean).join(', ')
  const locationPageHref = `/chef/${profileSlug}/locations/${location.id}`
  const inquiryHref = `${locationPageHref}/inquire`
  const bookingHref = location.booking_url
    ? `/chef/${profileSlug}/locations/${location.id}/book`
    : null

  return (
    <article className="overflow-hidden rounded-[28px] border border-stone-700 bg-stone-950/90 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-900">
        {activeImage ? (
          <Image
            src={activeImage.image_url}
            alt={activeImage.caption || `${location.name} venue image`}
            fill
            sizes="(max-width: 1280px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.22),_transparent_55%),linear-gradient(135deg,_rgba(28,25,23,0.92),_rgba(12,10,9,0.98))]" />
        )}
        <div className="absolute inset-x-0 top-0 flex flex-wrap gap-2 p-4">
          <Chip label={CHEF_LOCATION_RELATIONSHIP_LABELS[location.relationship_type]} tone="warm" />
          {cityState ? <Chip label={cityState} /> : null}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-300">
            {location.partner.name}
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-stone-50">
            {showLocationPageCta ? (
              <Link href={locationPageHref} className="transition-colors hover:text-amber-300">
                {location.name}
              </Link>
            ) : (
              location.name
            )}
          </h3>
          {location.description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-200">
              {location.description}
            </p>
          ) : null}
        </div>
      </div>

      {location.images.length > 1 ? (
        <div className="grid grid-cols-4 gap-2 border-b border-stone-800 bg-stone-950/90 p-3">
          {location.images.slice(0, 4).map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setImageIndex(index)}
              className={[
                'relative aspect-[4/3] overflow-hidden rounded-xl border transition',
                index === imageIndex
                  ? 'border-amber-500/70'
                  : 'border-stone-800 hover:border-stone-600',
              ].join(' ')}
            >
              <Image
                src={image.image_url}
                alt={image.caption || `${location.name} thumbnail ${index + 1}`}
                fill
                sizes="25vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}

      <div className="p-6">
        <div className="flex flex-wrap items-center gap-4 text-sm text-stone-300">
          {cityState ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-stone-500" />
              {cityState}
            </span>
          ) : null}
          {location.max_guest_count ? (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-stone-500" />
              Up to {location.max_guest_count} guests
            </span>
          ) : null}
          <span className="text-stone-500">
            {location.images.length} photo{location.images.length === 1 ? '' : 's'}
          </span>
        </div>

        {location.best_for.length > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Best For
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {location.best_for.map((value) => (
                <Chip key={value} label={LOCATION_BEST_FOR_LABELS[value]} />
              ))}
            </div>
          </div>
        ) : null}

        {location.service_types.length > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Formats
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {location.service_types.map((value) => (
                <Chip key={value} label={LOCATION_SERVICE_TYPE_LABELS[value]} />
              ))}
            </div>
          </div>
        ) : null}

        {location.experience_tags.length > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Gallery Tags
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {location.experience_tags.map((value) => (
                <Chip key={value} label={LOCATION_EXPERIENCE_TAG_LABELS[value]} />
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {showLocationPageCta ? (
            <TrackedLink
              href={locationPageHref}
              analyticsName="public_location_page_view"
              analyticsProps={{
                chef_slug: profileSlug,
                location_id: location.id,
                partner_id: location.partner.id,
              }}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-stone-700 px-4 py-3 text-sm font-semibold text-stone-100 transition hover:bg-stone-900"
            >
              View Setting Page
            </TrackedLink>
          ) : null}
          <TrackedLink
            href={inquiryHref}
            analyticsName="public_location_inquiry"
            analyticsProps={{
              chef_slug: profileSlug,
              location_id: location.id,
              partner_id: location.partner.id,
            }}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-400"
          >
            Ask {chefName} About This Setting
          </TrackedLink>
          {bookingHref ? (
            <TrackedLink
              href={bookingHref}
              analyticsName="public_location_booking_redirect"
              analyticsProps={{
                chef_slug: profileSlug,
                location_id: location.id,
                partner_id: location.partner.id,
              }}
              prefetch={false}
              target="_blank"
              rel="noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-stone-700 px-4 py-3 text-sm font-semibold text-stone-100 transition hover:bg-stone-900"
            >
              View Venue Booking
              <ExternalLink className="h-4 w-4" />
            </TrackedLink>
          ) : null}
        </div>
      </div>
    </article>
  )
}
