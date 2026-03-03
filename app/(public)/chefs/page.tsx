// Public Chef Directory — Premium Listing with Partner Showcase
// Server-rendered, SEO-friendly. Only admin-approved chefs appear.
// Founder (davidferra13@gmail.com) is always listed.
// Each chef tile showcases their face prominently + their partner venues.

import type { Metadata } from 'next'
import Link from 'next/link'
import { getDiscoverableChefs } from '@/lib/directory/actions'
import type { DirectoryChef, DirectoryPartner } from '@/lib/directory/actions'
import { ChefHero } from './_components/chef-hero'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Hire a Private Chef Near You — ChefFlow Chef Directory',
  description:
    'Book an unforgettable private dining experience. Browse curated private chefs, view their menus and reviews, and start your inquiry in seconds.',
  keywords: [
    'hire private chef',
    'private chef near me',
    'personal chef for hire',
    'private dinner party chef',
    'book a private chef',
    'private chef directory',
    'catering chef',
  ],
  openGraph: {
    title: 'Hire a Private Chef | ChefFlow',
    description:
      'Book an unforgettable private dining experience. Browse curated private chefs and start your inquiry in seconds.',
    url: `${APP_URL}/chefs`,
    type: 'website',
  },
  alternates: {
    canonical: `${APP_URL}/chefs`,
  },
}

const PARTNER_TYPE_LABELS: Record<string, string> = {
  airbnb_host: 'Airbnb',
  business: 'Hotel & Lodging',
  venue: 'Venue',
  platform: 'Platform',
  individual: 'Partner',
  other: 'Partner',
}

function PartnerPill({ partner }: { partner: DirectoryPartner }) {
  const locations = partner.partner_locations
  const cityState =
    locations.length > 0 ? [locations[0].city, locations[0].state].filter(Boolean).join(', ') : null

  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-stone-800 px-3 py-2">
      {partner.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={partner.cover_image_url}
          alt={partner.name}
          className="h-8 w-8 rounded-md object-cover flex-shrink-0"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-stone-700 flex-shrink-0">
          <svg
            className="h-4 w-4 text-stone-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-stone-200 truncate">{partner.name}</p>
        {cityState && <p className="text-[11px] text-stone-300 truncate">{cityState}</p>}
      </div>
      <span className="flex-shrink-0 rounded-full bg-stone-700/70 px-2 py-0.5 text-[10px] font-medium text-stone-500">
        {PARTNER_TYPE_LABELS[partner.partner_type] || 'Partner'}
      </span>
    </div>
  )
}

function ChefTile({ chef }: { chef: DirectoryChef }) {
  const hasPartners = chef.partners.length > 0
  // Show up to 3 partners on the tile, with a "+N more" if needed
  const visiblePartners = chef.partners.slice(0, 3)
  const extraCount = chef.partners.length - visiblePartners.length

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-stone-900 shadow-[0_2px_20px_rgb(0,0,0,0.06)] ring-1 ring-stone-100 transition-all duration-300 hover:shadow-[0_8px_40px_rgb(0,0,0,0.10)] hover:ring-brand-700 hover:-translate-y-1">
      {/* Chef photo — large, prominent */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-brand-100 to-brand-50">
        {chef.profile_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={chef.profile_image_url}
            alt={chef.display_name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-7xl font-display text-brand-300">
              {chef.display_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />

        {/* Name overlay on image */}
        <div className="absolute inset-x-0 bottom-0 p-5">
          <h2 className="text-xl font-bold text-white drop-shadow-sm">{chef.display_name}</h2>
          {chef.tagline && (
            <p className="mt-0.5 text-sm text-white/85 truncate drop-shadow-sm">{chef.tagline}</p>
          )}
        </div>

        {/* Founder badge */}
        {chef.is_founder && (
          <div className="absolute top-4 right-4 rounded-full bg-stone-900/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-brand-400 shadow-sm">
            Featured
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex flex-1 flex-col p-5">
        {/* Bio */}
        {chef.bio && (
          <p className="text-sm leading-relaxed text-stone-300 line-clamp-2">{chef.bio}</p>
        )}

        {/* Partner venues */}
        {hasPartners && (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-300">
              Where I Cook
            </p>
            <div className="space-y-1.5">
              {visiblePartners.map((partner) => (
                <PartnerPill key={partner.id} partner={partner} />
              ))}
              {extraCount > 0 && (
                <p className="text-center text-[11px] text-stone-300">
                  + {extraCount} more venue{extraCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Spacer to push buttons to bottom */}
        <div className="flex-1" />

        {/* Action buttons */}
        <div className="mt-5 flex gap-3">
          <Link
            href={`/chef/${chef.slug}/inquire`}
            className="flex-1 rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md active:scale-[0.98]"
          >
            Book Now
          </Link>
          <Link
            href={`/chef/${chef.slug}`}
            className="rounded-xl border border-stone-700 px-4 py-3 text-center text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100 hover:border-stone-600"
          >
            Profile
          </Link>
        </div>
      </div>
    </article>
  )
}

export default async function ChefDirectoryPage() {
  const chefs = await getDiscoverableChefs()

  return (
    <div className="min-h-screen bg-stone-800">
      {/* Hero */}
      <ChefHero />

      {/* Chef Grid */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 lg:px-8">
        {chefs.length === 0 ? (
          <div className="text-center py-24">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-950">
              <span className="text-4xl">&#x1F468;&#x200D;&#x1F373;</span>
            </div>
            <h2 className="text-xl font-semibold text-stone-300">Our chef roster is coming soon</h2>
            <p className="mt-2 text-stone-500 max-w-md mx-auto">
              We&apos;re hand-selecting the best private chefs in the area. Check back soon or{' '}
              <Link
                href="/contact"
                className="font-medium text-brand-600 hover:text-brand-400 underline"
              >
                get in touch
              </Link>{' '}
              to be the first to know.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <p className="text-sm font-medium uppercase tracking-widest text-brand-600">
                {chefs.length} curated chef{chefs.length !== 1 ? 's' : ''} available
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {chefs.map((chef) => (
                <ChefTile key={chef.id} chef={chef} />
              ))}
            </div>
          </>
        )}

        {/* Trust footer */}
        <div className="mt-16 text-center">
          <div className="mx-auto max-w-lg rounded-2xl border border-stone-700 bg-stone-900 p-6 shadow-sm">
            <p className="text-sm font-semibold text-stone-200">
              Every chef on ChefFlow is personally vetted
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
              We work with experienced private chefs who have been hand-selected for their craft,
              professionalism, and commitment to creating unforgettable dining experiences.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
