import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/seo/json-ld'
import { buildMarketingMetadata } from '@/lib/site/public-site'
import { HomepageDiscovery } from './_components/homepage-discovery'
import { HeroBackgroundImage } from './_components/hero-background-image'
import { HomepageSeasonalSpotlight } from './_components/homepage-seasonal-spotlight'
import { FeaturedChefSpotlight } from './_components/featured-chef-spotlight'
import { HeroTrustBar } from './_components/hero-trust-bar'
import LandingBelowFold from './_components/landing-below-fold'
import { getPublicPlatformStats } from '@/lib/directory/public-stats'
import { getDiscoverableChefs } from '@/lib/directory/actions'
import { getPublicSeasonalMarketPulse } from '@/lib/public/public-seasonal-market-pulse'
import { getOptimizedAvatar } from '@/lib/images/cloudinary'
import type {
  DiscoveryRailItem,
  FeaturedChefRailData,
  HomepageLocationContext,
} from '@/lib/discovery/homepage-discovery-rail'
import { getServerSavedLocation } from '@/lib/location/server-location'

export const revalidate = 60

const marketingMetadata = buildMarketingMetadata({
  title: 'Book Private Chefs Near You for Dinners, Events & Meal Prep',
  description:
    'Book private chefs near you for dinner parties, catering, weekly meal prep, weddings, corporate dining, and chef-led events. Browse live chef profiles or start one request.',
  path: '/',
  imagePath: '/social/chefflow-home.png',
  imageAlt: 'ChefFlow private chef booking preview',
})

export const metadata: Metadata = {
  ...marketingMetadata,
  keywords: [
    'hire private chef',
    'private chef near me',
    'food marketplace',
    'chef marketplace',
    'chef-made meals',
    'book a private chef',
    'catering near me',
    'meal prep service',
    'personal chef for hire',
    'private chef software',
    'catering software',
  ],
}

interface AvatarChef {
  slug: string
  displayName: string
  imageUrl: string
}

function ChefAvatarStrip({ chefs }: { chefs: AvatarChef[] }) {
  if (chefs.length === 0) return null
  return (
    <div className="mt-8 flex flex-col items-center gap-2">
      <div className="flex items-center">
        {chefs.map((chef) => (
          <div
            key={chef.slug}
            className="relative -ml-2.5 h-9 w-9 overflow-hidden rounded-full border-2 border-[#1a0e08] ring-1 ring-white/10 first:ml-0"
            title={chef.displayName}
          >
            <Image
              src={chef.imageUrl}
              alt={chef.displayName}
              width={36}
              height={36}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
      <Link href="/chefs" className="text-xs text-stone-500 transition-colors hover:text-stone-300">
        Real chefs. Real kitchens.
      </Link>
    </div>
  )
}

export default async function Home() {
  const [platformStats, allChefs, seasonalPulse, serverSavedLocation] = await Promise.all([
    getPublicPlatformStats(),
    getDiscoverableChefs(),
    getPublicSeasonalMarketPulse().catch(() => null),
    getServerSavedLocation().catch(() => null),
  ])

  // Select up to 5 featured chefs for the discovery rail.
  // Prefer chefs with: cuisine info, city/state, and profile image.
  // Avoid test/demo accounts (already filtered by getDiscoverableChefs).
  let featuredChefs: FeaturedChefRailData[] = allChefs
    .filter((c) => c.slug && c.display_name && c.discovery.cuisine_types.length > 0)
    .sort((a, b) => {
      // Prefer chefs with more complete profile data
      const scoreA =
        (a.profile_image_url ? 2 : 0) +
        (a.discovery.service_area_city ? 1 : 0) +
        (a.is_founder ? 1 : 0)
      const scoreB =
        (b.profile_image_url ? 2 : 0) +
        (b.discovery.service_area_city ? 1 : 0) +
        (b.is_founder ? 1 : 0)
      return scoreB - scoreA
    })
    .slice(0, 5)
    .map((c) => ({
      slug: c.slug!,
      displayName: c.display_name,
      primaryCuisine: c.discovery.cuisine_types[0] ?? null,
      city: c.discovery.service_area_city ?? null,
      state: c.discovery.service_area_state ?? null,
      specialty: c.tagline ?? null,
      acceptingInquiries: c.discovery.accepting_inquiries ?? null,
      priceTier: (c.discovery.price_range as 'budget' | 'mid' | 'premium' | 'luxury') ?? null,
      dietaryStrengths:
        c.discovery.dietary_specialties.length > 0 ? c.discovery.dietary_specialties : null,
    }))

  // When server has a saved location, prefer chefs in the same state
  if (serverSavedLocation?.state) {
    const savedState = serverSavedLocation.state
    const localChefs = featuredChefs.filter(
      (c) => c.state?.toLowerCase() === savedState.toLowerCase()
    )
    if (localChefs.length >= 2) {
      const otherChefs = featuredChefs.filter(
        (c) => c.state?.toLowerCase() !== savedState.toLowerCase()
      )
      featuredChefs = [...localChefs, ...otherChefs].slice(0, 5)
    }
  }

  // Build featured chefs with images for the spotlight section.
  const featuredChefsWithImages = allChefs
    .filter(
      (c) => c.slug && c.display_name && c.profile_image_url && c.discovery.cuisine_types.length > 0
    )
    .sort((a, b) => {
      const scoreA = (a.discovery.service_area_city ? 1 : 0) + (a.is_founder ? 1 : 0)
      const scoreB = (b.discovery.service_area_city ? 1 : 0) + (b.is_founder ? 1 : 0)
      return scoreB - scoreA
    })
    .slice(0, 5)
    .map((c) => ({
      slug: c.slug!,
      displayName: c.display_name,
      primaryCuisine: c.discovery.cuisine_types[0] ?? null,
      city: c.discovery.service_area_city ?? null,
      state: c.discovery.service_area_state ?? null,
      profileImageUrl: c.profile_image_url,
    }))

  // Build avatar strip: top chefs with profile photos, max 6.
  const avatarChefs: AvatarChef[] = allChefs
    .filter((c) => c.profile_image_url && c.slug && c.display_name)
    .sort((a, b) => {
      const scoreA = (a.profile_image_url ? 2 : 0) + (a.is_founder ? 1 : 0)
      const scoreB = (b.profile_image_url ? 2 : 0) + (b.is_founder ? 1 : 0)
      return scoreB - scoreA
    })
    .slice(0, 6)
    .map((c) => ({
      slug: c.slug!,
      displayName: c.display_name,
      imageUrl: getOptimizedAvatar(c.profile_image_url!, 64),
    }))

  // Build culinary signal rail items from the seasonal market pulse.
  // These are seasonal ingredient discovery inserts routed to /ingredients.
  // Derived from the public seasonal calendar, with no fake events or external data.
  const culinarySignals: DiscoveryRailItem[] = seasonalPulse
    ? [
        ...seasonalPulse.peakNow.slice(0, 2).map(
          (ingredient): DiscoveryRailItem => ({
            type: 'culinary_signal',
            label: ingredient.name,
            sublabel: `In season · ${seasonalPulse.season.name}`,
            href: '/ingredients',
            icon: 'market' as const,
          })
        ),
        ...(seasonalPulse.endingSoon
          ? [
              {
                type: 'culinary_signal' as const,
                label: seasonalPulse.endingSoon.name,
                sublabel: 'Ending soon',
                href: '/ingredients',
                icon: 'market' as const,
              },
            ]
          : []),
      ].slice(0, 3)
    : []

  const initialLocationContext: HomepageLocationContext | null = serverSavedLocation
    ? {
        location: serverSavedLocation.displayLabel,
        lat: serverSavedLocation.lat,
        lng: serverSavedLocation.lng,
      }
    : null

  return (
    <main>
      <PublicPageView
        pageName="home"
        properties={{
          section: 'consumer_and_operator',
          entry_context: 'direct',
          primary_intent: 'book_private_chef',
        }}
      />
      <OrganizationJsonLd />
      <WebSiteJsonLd />

      {/* ── Consumer Hero ── */}
      <section className="relative overflow-hidden">
        {/* Deep burgundy gradient background, tuned for beet dish hero */}
        <div className="pointer-events-none absolute inset-0 bg-[#1a0a0f]">
          {/* Primary ruby/burgundy bloom, center of attention */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_38%,_rgba(140,20,45,0.75),_transparent)]" />
          {/* Secondary depth layers with purple and deep red undertones */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_25%_15%,_rgba(80,15,60,0.45),_transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_38%_at_75%_72%,_rgba(60,10,25,0.35),_transparent)]" />
          {/* Golden-orange accent spots matching sauce tones */}
          <div className="absolute top-[18%] right-[22%] h-80 w-80 rounded-full bg-[radial-gradient(ellipse,_rgba(210,150,40,0.22),_transparent_70%)] blur-3xl" />
          <div className="absolute bottom-[28%] left-[18%] h-64 w-64 rounded-full bg-[radial-gradient(ellipse,_rgba(230,170,50,0.14),_transparent_70%)] blur-2xl" />
          {/* Very subtle top vignette to ground the text */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/25 to-transparent" />
        </div>

        <HeroBackgroundImage />

        <div className="relative mx-auto w-full max-w-4xl px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8 lg:pb-28 lg:pt-32">
          <div className="text-center">
            {/* Trust badge shown only when real stats exist */}
            {platformStats.verifiedChefCount != null && (
              <div className="mb-6 trust-badge-ring inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-200/90 backdrop-blur-sm">
                {platformStats.avgRating != null && (
                  <>
                    <span className="text-amber-400 text-xs">★★★★★</span>
                    <span>{platformStats.avgRating.toFixed(1)}</span>
                    <span>&middot;</span>
                  </>
                )}
                <span>
                  {platformStats.verifiedChefCount}+ directory-approved chef profiles
                  {platformStats.cityCoveredCount != null && (
                    <>&nbsp;&middot;&nbsp;{platformStats.cityCoveredCount}+ cities</>
                  )}
                </span>
              </div>
            )}
            <h1 className="font-display-serif mx-auto max-w-4xl text-5xl font-extrabold tracking-[-0.02em] sm:text-6xl lg:text-7xl lg:tracking-[-0.03em]">
              <span className="homepage-hero-shimmer hero-line hero-line-1">
                Book a private chef near you
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base font-light leading-relaxed text-stone-300 sm:text-lg">
              Find chefs for dinner parties, catering, weekly meal prep, weddings, corporate meals,
              and private events. Browse live profiles or send one request for matched chef review.
            </p>
          </div>

          <HomepageDiscovery
            featuredChefs={featuredChefs}
            culinarySignals={culinarySignals}
            userSignals={null}
            initialLocationContext={initialLocationContext}
          />
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedLink
              href="/book"
              analyticsName="home_consumer_hero_book_private_chef"
              analyticsProps={{
                section: 'consumer_hero',
                destination: '/book',
              }}
              className="inline-flex min-h-14 items-center justify-center rounded-2xl gradient-accent px-10 text-base font-semibold text-white shadow-lg shadow-[#8b4513]/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#8b4513]/40 active:scale-[0.98] cta-shimmer"
            >
              Book a private chef
            </TrackedLink>
            <TrackedLink
              href="/chefs"
              analyticsName="home_consumer_hero_browse_chefs"
              analyticsProps={{
                section: 'consumer_hero',
                destination: '/chefs',
              }}
              className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-[#4a3020]/55 bg-[#1a110c]/60 px-10 text-base font-semibold text-stone-100 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-[#e8a96b]/45 hover:bg-[#2a1a10]/70 active:scale-[0.98]"
            >
              Browse chefs near you
            </TrackedLink>
          </div>

          <HeroTrustBar stats={platformStats} avatarChefs={avatarChefs} />

          {/* Sentinel: sticky mobile CTA appears when this scrolls out of view */}
          <div id="hero-cta-sentinel" className="h-px" aria-hidden="true" />
        </div>
      </section>

      {/* ── Seasonal Band ── */}
      <div className="zone-seasonal zone-transition">
        <HomepageSeasonalSpotlight pulse={seasonalPulse} />
      </div>

      {/* ── Featured Chef Spotlight ── */}
      <div className="zone-featured zone-transition">
        <FeaturedChefSpotlight chefs={featuredChefsWithImages} />
      </div>

      {/* ── Below Fold Content ── */}
      <div className="zone-howit">
        <LandingBelowFold />
      </div>
    </main>
  )
}
