import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getDiscoverableChefs, type DirectoryChef } from '@/lib/directory/actions'
import { getDiscoveryServiceTypeLabel } from '@/lib/discovery/constants'
import { getDiscoveryAvailabilityLabel, getDiscoveryLocationLabel } from '@/lib/discovery/profile'
import { getChefCoverage, sortDirectoryChefs } from '@/lib/directory/utils'
import { getOptimizedImageUrl } from '@/lib/images/cloudinary'
import {
  OrganizationJsonLd,
  SoftwareApplicationJsonLd,
  WebSiteJsonLd,
} from '@/components/seo/json-ld'
import { HomepageSearch } from './_components/homepage-search'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'ChefFlow - Find a Private Chef Near You',
  description:
    'Discover private chefs for dinners, catering, meal prep, and chef-led experiences. Browse profiles, check availability, and send an inquiry in minutes.',
  openGraph: {
    title: 'ChefFlow - Find a Private Chef Near You',
    description:
      'Discover private chefs for dinners, catering, meal prep, and chef-led experiences. Browse profiles, check availability, and send an inquiry in minutes.',
    url: BASE_URL,
    siteName: 'ChefFlow',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChefFlow - Find a Private Chef Near You',
    description:
      'Discover private chefs for dinners, catering, meal prep, and chef-led experiences.',
  },
  keywords: [
    'private chef near me',
    'hire a private chef',
    'book a caterer',
    'private dining experience',
    'chef for dinner party',
    'meal prep delivery',
    'find a caterer',
    'personal chef for hire',
  ],
  alternates: {
    canonical: BASE_URL,
  },
}

const SERVICE_CATEGORIES = [
  {
    label: 'Private Dinners',
    value: 'private_dinner',
    description: 'Intimate meals crafted in your home',
    icon: '🍽',
  },
  {
    label: 'Catering',
    value: 'catering',
    description: 'Events of any size, handled start to finish',
    icon: '🎉',
  },
  {
    label: 'Meal Prep',
    value: 'meal_prep',
    description: 'Weekly meals tailored to your household',
    icon: '🥗',
  },
  {
    label: 'Weddings',
    value: 'wedding',
    description: 'Your day, your menu, your chef',
    icon: '💒',
  },
  {
    label: 'Corporate Dining',
    value: 'corporate',
    description: 'Team lunches, retreats, and client events',
    icon: '🏢',
  },
  {
    label: 'Cooking Classes',
    value: 'cooking_class',
    description: 'Hands-on sessions with a professional',
    icon: '👨‍🍳',
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Search',
    description: 'Browse chefs by location, cuisine, or service type. Every chef is vetted.',
  },
  {
    step: '02',
    title: 'Connect',
    description: 'Send an inquiry directly. No middleman, no commission, no hidden fees.',
  },
  {
    step: '03',
    title: 'Enjoy',
    description: 'Your chef handles the details. You enjoy the experience.',
  },
]

// Inline SVG social icons for Featured Chef cards (no icon library dependency)
const SOCIAL_ICONS: Record<string, { label: string; icon: React.ReactNode }> = {
  instagram: {
    label: 'Instagram',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  tiktok: {
    label: 'TikTok',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48v-7.15a8.16 8.16 0 005.58 2.2v-3.45a4.85 4.85 0 01-3.77-1.82 4.83 4.83 0 003.77-2.77z" />
      </svg>
    ),
  },
  facebook: {
    label: 'Facebook',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  youtube: {
    label: 'YouTube',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  linktree: {
    label: 'Link hub',
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
        />
      </svg>
    ),
  },
}

function FeaturedChefCard({ chef }: { chef: DirectoryChef }) {
  const rawHeroImage = chef.discovery.hero_image_url || chef.profile_image_url
  const heroImage = rawHeroImage
    ? getOptimizedImageUrl(rawHeroImage, { width: 600, height: 450, fit: 'fill', gravity: 'auto' })
    : null
  const coverage = getChefCoverage(chef)
  const primaryServices = chef.discovery.service_types.slice(0, 2).map(getDiscoveryServiceTypeLabel)
  const availabilityLabel = getDiscoveryAvailabilityLabel(chef.discovery)
  const hasRating = chef.discovery.avg_rating != null && chef.discovery.review_count > 0
  const socialEntries = Object.entries(chef.social_links || {}).filter(
    ([, url]) => typeof url === 'string' && url.length > 0
  )
  const hasReviews = chef.discovery.review_count > 0
  const hasWebsiteLink = Boolean(chef.website_url && chef.show_website_on_public_profile)
  const preferWebsite = chef.preferred_inquiry_destination === 'website_only'
  const preferChefFlow = chef.preferred_inquiry_destination === 'chefflow_only'
  // Primary CTA destination: respect preferred_inquiry_destination
  const primaryCtaHref =
    preferWebsite && hasWebsiteLink ? chef.website_url! : `/chef/${chef.slug}/inquire`
  const primaryCtaIsExternal = preferWebsite && hasWebsiteLink
  const primaryCtaLabel = preferWebsite && hasWebsiteLink ? 'Visit website' : 'Inquire'
  const showPrimaryCta = chef.discovery.accepting_inquiries || (preferWebsite && hasWebsiteLink)

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-stone-900 ring-1 ring-stone-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgb(0,0,0,0.25)] hover:ring-brand-600">
      <Link href={`/chef/${chef.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-brand-100 to-brand-50">
          {heroImage ? (
            <Image
              src={heroImage}
              alt={chef.display_name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-7xl font-display text-brand-300">
                {chef.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 via-black/35 to-transparent" />

          <div className="absolute top-3 left-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm ${
                chef.discovery.accepting_inquiries
                  ? 'bg-emerald-900/85 text-emerald-300'
                  : 'bg-amber-950/90 text-amber-300'
              }`}
            >
              {availabilityLabel}
            </span>
          </div>

          {hasRating && (
            <div className="absolute top-3 right-3">
              <span className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-amber-300 backdrop-blur-sm">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {chef.discovery.avg_rating!.toFixed(1)} ({chef.discovery.review_count})
              </span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 p-4">
            <h3 className="text-lg font-bold text-white drop-shadow-sm">{chef.display_name}</h3>
            {chef.tagline && (
              <p className="mt-0.5 text-sm text-white/80 truncate drop-shadow-sm">{chef.tagline}</p>
            )}
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {primaryServices.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {primaryServices.map((label) => (
              <span
                key={label}
                className="rounded-full border border-stone-700 bg-stone-950 px-2.5 py-0.5 text-xs font-medium text-stone-300"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {socialEntries.length > 0 && (
          <div className="mt-2.5 flex items-center gap-2">
            {socialEntries.slice(0, 4).map(([platform, url]) => {
              const config = SOCIAL_ICONS[platform]
              if (!config) return null
              return (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-500 hover:text-stone-200 transition-colors"
                  aria-label={config.label}
                >
                  {config.icon}
                </a>
              )
            })}
            {socialEntries.length > 4 && (
              <span className="text-xs text-stone-600">+{socialEntries.length - 4}</span>
            )}
          </div>
        )}

        {(hasReviews || chef.google_review_url || (hasWebsiteLink && !showPrimaryCta)) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {hasReviews && (
              <a
                href={`/chef/${chef.slug}#reviews`}
                className="inline-flex items-center gap-1 rounded-md border border-stone-700 px-2 py-1 text-xs text-stone-400 hover:text-stone-200 hover:border-stone-600 transition-colors"
              >
                <svg className="h-3 w-3 text-amber-400 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                See reviews
              </a>
            )}
            {chef.google_review_url && (
              <a
                href={chef.google_review_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-stone-700 px-2 py-1 text-xs text-stone-400 hover:text-stone-200 hover:border-stone-600 transition-colors"
              >
                Google reviews
              </a>
            )}
            {hasWebsiteLink && !primaryCtaIsExternal && (
              <a
                href={chef.website_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-stone-700 px-2 py-1 text-xs text-stone-400 hover:text-stone-200 hover:border-stone-600 transition-colors"
              >
                Website
              </a>
            )}
          </div>
        )}

        {coverage.length > 0 && (
          <p className="mt-2 text-xs text-stone-500">
            Serves {coverage.slice(0, 2).join(', ')}
            {coverage.length > 2 ? ` +${coverage.length - 2} more` : ''}
          </p>
        )}

        {showPrimaryCta && (
          <div className="mt-auto pt-3">
            <a
              href={primaryCtaHref}
              {...(primaryCtaIsExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="flex h-9 w-full items-center justify-center rounded-lg gradient-accent text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              {primaryCtaLabel}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default async function Home() {
  const allChefs = await getDiscoverableChefs()
  const sorted = sortDirectoryChefs(allChefs, 'featured')
  const featuredChefs = sorted.slice(0, 6)

  return (
    <main>
      <OrganizationJsonLd />
      <SoftwareApplicationJsonLd />
      <WebSiteJsonLd />
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-600/8 via-transparent to-transparent" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-brand-500/6 blur-3xl" />

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-8 pt-20 text-center sm:px-6 md:pb-14 md:pt-28 lg:px-8">
          <h1 className="max-w-4xl text-4xl font-display tracking-tight text-white md:text-5xl lg:text-6xl">
            Find a private chef <span className="text-gradient">near you.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-300 md:text-xl">
            Browse by cuisine, location, or occasion. Connect directly with vetted chefs for private
            dinners, catering, meal prep, and more.
          </p>

          {/* Dual CTAs */}
          <div className="mt-10 w-full max-w-2xl space-y-4">
            <Link
              href="/book"
              className="flex h-14 w-full items-center justify-center rounded-2xl gradient-accent text-base font-semibold text-white glow-hover shadow-lg transition-transform active:scale-[0.97] touch-manipulation"
            >
              Book a Private Chef
            </Link>
            <div className="relative flex items-center gap-4">
              <div className="flex-1 border-t border-stone-700/60" />
              <span className="text-xs text-stone-500 uppercase tracking-wider">
                or browse chefs
              </span>
              <div className="flex-1 border-t border-stone-700/60" />
            </div>
            <HomepageSearch />
          </div>

          {/* Trust signals */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-stone-400">
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Free to browse
            </span>
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              No middleman
            </span>
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Zero commission
            </span>
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Every chef is vetted
            </span>
          </div>
        </div>
      </section>

      {/* Service Categories */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <h2 className="text-center font-display text-2xl font-bold text-stone-100 md:text-3xl tracking-tight">
          What are you looking for?
        </h2>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SERVICE_CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={`/chefs?serviceType=${cat.value}`}
              className="group flex flex-col items-center rounded-2xl border border-stone-700/60 bg-stone-900/50 px-4 py-6 text-center transition-all hover:border-brand-600/50 hover:bg-stone-800/60 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="text-3xl" role="img" aria-label={cat.label}>
                {cat.icon}
              </span>
              <span className="mt-3 text-sm font-semibold text-stone-200 group-hover:text-stone-50">
                {cat.label}
              </span>
              <span className="mt-1 text-xs text-stone-500 leading-snug">{cat.description}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Chefs */}
      {featuredChefs.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-stone-100 md:text-3xl tracking-tight">
                Featured chefs
              </h2>
              <p className="mt-2 text-sm text-stone-400">
                Vetted professionals ready to create your next experience.
              </p>
            </div>
            <Link
              href="/chefs"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-stone-700 px-4 py-2.5 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100 hover:border-stone-600"
            >
              View all chefs
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredChefs.map((chef) => (
              <FeaturedChefCard key={chef.id} chef={chef} />
            ))}
          </div>
          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/chefs"
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-700 px-5 py-3 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100"
            >
              View all chefs
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="border-t border-stone-800/40">
        <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <h2 className="text-center font-display text-2xl font-bold text-stone-100 md:text-3xl tracking-tight">
            How it works
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/15 border border-brand-600/30">
                  <span className="text-lg font-display font-bold text-brand-400">{item.step}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-stone-100">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Operators CTA */}
      <section className="border-t border-stone-800/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center sm:px-6 md:py-20 lg:px-8">
          <p className="mb-4 rounded-full border border-brand-700/30 bg-brand-950/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-300">
            For Chefs and Operators
          </p>
          <h2 className="font-display text-2xl font-bold text-stone-100 md:text-3xl tracking-tight">
            Run your entire business on ChefFlow.
          </h2>
          <p className="mt-4 max-w-xl text-base text-stone-400 leading-relaxed">
            Clients, events, menus, recipes, finances, and staff. One platform that respects your
            craft and your privacy. Free forever, zero commission.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/for-operators"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-stone-700 bg-stone-900/60 px-6 text-sm font-medium text-stone-300 transition-all hover:bg-stone-800 hover:border-stone-600 hover:text-stone-100"
            >
              Learn more
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex h-12 items-center justify-center rounded-xl gradient-accent px-6 text-sm font-semibold text-white glow-hover shadow-lg"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
