import React from 'react'
import Link from 'next/link'
import { getBusinessTypeLabel, getCuisineLabel } from '@/lib/discover/constants'
import { formatDistanceMiles } from '@/lib/discover/nearby-search'
import { getDirectoryListingTrust } from '@/lib/discover/trust'
import { formatDate } from '@/lib/utils/format'
import type { DirectoryListingSummary } from '@/lib/discover/actions'
import { CategoryPlaceholder } from './category-icon'
import { DirectoryFavoriteButton, type DirectoryFavoriteMode } from './directory-favorite-button'

type Props = {
  listing: DirectoryListingSummary
  favoriteMode?: DirectoryFavoriteMode
}

type NearbyCardTone = 'verified' | 'claimed' | 'public' | 'warning' | 'muted'

function trustToneClasses(tone: NearbyCardTone) {
  if (tone === 'verified') {
    return 'border-emerald-500/25 bg-emerald-950/60 text-emerald-200'
  }

  if (tone === 'claimed') {
    return 'border-sky-500/25 bg-sky-950/60 text-sky-200'
  }

  if (tone === 'warning') {
    return 'border-amber-500/25 bg-amber-950/60 text-amber-200'
  }

  if (tone === 'public') {
    return 'border-stone-700/80 bg-stone-950/70 text-stone-200'
  }

  return 'border-stone-800/80 bg-stone-950/40 text-stone-400'
}

function parseNearbyDate(value: unknown): Date | null {
  if (!value) return null
  const parsed = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function joinSignalLabels(values: string[]) {
  if (values.length === 0) return ''
  if (values.length === 1) return values[0]
  if (values.length === 2) return `${values[0]} and ${values[1]}`
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`
}

function buildTrustPresentation(status: string) {
  if (status === 'verified') {
    return {
      statusLabel: 'Verified',
      confidenceLabel: 'High confidence',
      confidenceTone: 'verified' as const,
      summary: 'Owner verified this profile, so it carries the strongest trust signal on Nearby.',
      fallbackPrefix: 'Owner-verified listing',
    }
  }

  if (status === 'claimed') {
    return {
      statusLabel: 'Claimed',
      confidenceLabel: 'Mixed confidence',
      confidenceTone: 'claimed' as const,
      summary:
        'The business claimed this listing, but some fields may still be inherited from public sources.',
      fallbackPrefix: 'Owner-claimed listing',
    }
  }

  return {
    statusLabel: 'Discovered',
    confidenceLabel: 'Public-source only',
    confidenceTone: 'public' as const,
    summary:
      'This listing was discovered from public sources and may need confirmation before use.',
    fallbackPrefix: 'Public-source listing',
  }
}

export function ListingCard({ listing, favoriteMode = 'hidden' }: Props) {
  const photoUrls = Array.isArray(listing.photo_urls)
    ? listing.photo_urls.filter((url) => typeof url === 'string' && url.trim().length > 0)
    : []
  const primaryPhoto = photoUrls[0] ?? null
  const hasPhoto = Boolean(primaryPhoto)
  const trust = getDirectoryListingTrust(listing)
  const trustPresentation = buildTrustPresentation(listing.status)
  const cuisineLabels = Array.isArray(listing.cuisine_types)
    ? listing.cuisine_types
        .filter((c) => c !== 'other')
        .slice(0, 3)
        .map(getCuisineLabel)
    : []
  const locationParts = [
    listing.city && listing.city !== 'unknown' ? listing.city : null,
    listing.state,
  ].filter(Boolean)
  const location = locationParts.join(', ')
  const distanceLabel = formatDistanceMiles(listing.distance_miles)
  const freshnessWarnings = [
    trust.contact?.tone === 'warning' ? 'contact' : null,
    trust.hours?.tone === 'warning' ? 'hours' : null,
    trust.menu?.tone === 'warning' ? 'menu' : null,
  ].filter(Boolean) as string[]
  const updatedAt = parseNearbyDate(listing.updated_at)
  const freshnessSignal =
    freshnessWarnings.length > 0
      ? {
          label: 'Check freshness',
          tone: 'warning' as const,
          detail: `Older ${joinSignalLabels(freshnessWarnings)} details may still need confirmation.`,
        }
      : updatedAt
        ? {
            label: `Updated ${formatDate(updatedAt)}`,
            tone:
              listing.status === 'verified'
                ? ('verified' as const)
                : listing.status === 'claimed'
                  ? ('claimed' as const)
                  : ('public' as const),
            detail:
              listing.status === 'verified'
                ? 'Freshness is based on the latest owner-backed listing update.'
                : listing.status === 'claimed'
                  ? 'Freshness is based on the latest listing update after claim or public sync.'
                  : 'Freshness is based on the latest public listing refresh.',
          }
        : {
            label: 'Update date unavailable',
            tone: 'muted' as const,
            detail:
              'Open the detail page to review field-level trust notes before relying on this card.',
          }
  const supportingText =
    listing.description?.trim() ||
    listing.address?.trim() ||
    (location
      ? `${trustPresentation.fallbackPrefix} in ${location}.`
      : `${trustPresentation.fallbackPrefix}.`)

  return (
    <React.Fragment>
      <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-stone-900 ring-1 ring-stone-800 transition-all duration-300 hover:-translate-y-1 hover:ring-stone-600 hover:shadow-[0_8px_40px_rgb(0,0,0,0.25)]">
        {/* Image area */}
        <div className="relative aspect-[16/10] overflow-hidden">
          {hasPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primaryPhoto ?? undefined}
              alt={listing.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <CategoryPlaceholder businessType={listing.business_type} name={listing.name} />
          )}

          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />

          <div className="absolute right-3 top-3">
            <DirectoryFavoriteButton
              listingId={listing.id}
              listingName={listing.name}
              initialFavorited={listing.is_favorited}
              mode={favoriteMode}
            />
          </div>

          {/* Price range */}
          {listing.price_range && (
            <div className="absolute bottom-3 right-3">
              <span className="rounded-full bg-stone-900/90 px-2.5 py-0.5 text-xs font-semibold text-stone-200 backdrop-blur-sm">
                {listing.price_range}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="line-clamp-1 text-base font-bold text-stone-100">{listing.name}</h3>
              {(location || distanceLabel) && (
                <p className="mt-1 text-xs text-stone-500">
                  {[location, distanceLabel].filter(Boolean).join(' | ')}
                </p>
              )}
            </div>
            <div className="flex flex-shrink-0 flex-col items-end gap-1">
              <span className="rounded-full bg-stone-800 px-2 py-0.5 text-xxs font-medium text-stone-400">
                {getBusinessTypeLabel(listing.business_type)}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-xxs font-semibold ${trustToneClasses(trustPresentation.confidenceTone)}`}
              >
                {trustPresentation.statusLabel}
              </span>
            </div>
          </div>

          {listing.phone && (
            <a
              href={`tel:${listing.phone}`}
              className="mt-1 block text-xs text-stone-400 transition-colors hover:text-brand-400"
            >
              {listing.phone}
            </a>
          )}

          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-400">
            {supportingText}
          </p>

          <div className="mt-3 rounded-xl border border-stone-800/80 bg-stone-950/60 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Trust
                </p>
                <p className="mt-1 text-xs font-semibold text-stone-100">
                  {trustPresentation.confidenceLabel}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${trustToneClasses(freshnessSignal.tone)}`}
              >
                {freshnessSignal.label}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-stone-400">
              {trustPresentation.summary}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
              {freshnessSignal.detail}
            </p>
          </div>

          {cuisineLabels.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {cuisineLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-stone-700 bg-stone-950 px-2 py-0.5 text-xxs font-medium text-stone-400"
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          <div className="flex-1" />

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            {listing.website_url && (
              <a
                href={listing.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-lg bg-brand-600 px-3 py-2.5 text-center text-xs font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Visit website
              </a>
            )}
            {listing.lat && listing.lon && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${listing.lat},${listing.lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`rounded-lg border border-stone-700 px-3 py-2.5 text-center text-xs font-medium text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100 ${!listing.website_url ? 'flex-1' : ''}`}
              >
                Directions
              </a>
            )}
            <Link
              href={`/nearby/${listing.slug}`}
              className={`rounded-lg border border-stone-700 px-3 py-2.5 text-center text-xs font-medium text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100 ${!listing.website_url && !(listing.lat && listing.lon) ? 'flex-1' : ''}`}
            >
              Review details
            </Link>
          </div>
        </div>
      </article>
    </React.Fragment>
  )
}
