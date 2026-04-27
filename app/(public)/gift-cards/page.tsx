import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { getDiscoveryCuisineLabel, getDiscoveryServiceTypeLabel } from '@/lib/discovery/constants'
import {
  getDiscoveryAvailabilityLabel,
  getDiscoveryGuestCountLabel,
  getDiscoveryLocationLabel,
} from '@/lib/discovery/profile'
import { getDiscoverableChefs, type DirectoryChef } from '@/lib/directory/actions'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
const GIFT_CARDS_OG_IMAGE_URL = `${APP_URL}/gift-cards-og.jpg`

const POLICY_ITEMS = [
  {
    title: 'Expiration',
    body: 'Gift cards purchased through this page do not expire by default. If a chef later issues a separate promotional voucher or manually sets an expiration, that date should be shown with the code.',
  },
  {
    title: 'Refundability',
    body: 'This page does not promise automatic or marketplace-wide refunds after a gift card has been delivered. If a refund is approved, it is handled against the original Stripe payment record and the applicable written terms.',
  },
  {
    title: 'Delivery Timing',
    body: 'After successful checkout, the recipient is sent the gift card code by email and the buyer receives a confirmation email. Delivery is intended to happen right away, but inbox filtering and email provider delays can still affect timing.',
  },
  {
    title: 'Redemption Basics',
    body: 'Recipients redeem the code toward an accepted event on ChefFlow. The code applies up to the remaining balance. If there is a balance left, the rest is paid normally. If the gift card covers the full amount, the chef still confirms payment inside ChefFlow.',
  },
  {
    title: 'Where Terms Apply',
    body: 'Using this page is subject to ChefFlow site terms and privacy policy. If a chef provides separate service terms for the booked event, those terms apply when the gift card is redeemed.',
  },
] as const

export const metadata: Metadata = {
  title: 'Private Chef Gift Cards',
  description:
    'Browse public chef gift card pages on ChefFlow. Buy online, send by email, and redeem toward a future booked service.',
  alternates: {
    canonical: `${APP_URL}/gift-cards`,
  },
  openGraph: {
    title: 'Private Chef Gift Cards',
    description: 'Browse public chef gift card pages on ChefFlow. Buy online and send by email.',
    url: `${APP_URL}/gift-cards`,
    siteName: 'ChefFlow',
    type: 'website',
    images: [
      {
        url: GIFT_CARDS_OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: 'ChefFlow private chef gift cards',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Private Chef Gift Cards',
    description: 'Browse public chef gift card pages on ChefFlow. Buy online and send by email.',
    images: [GIFT_CARDS_OG_IMAGE_URL],
  },
  keywords: [
    'private chef gift cards',
    'chef gift card',
    'gift a private chef experience',
    'private chef gift certificate',
    'ChefFlow gift cards',
  ],
}

export const revalidate = 120

function hasHumanReadableDisplayName(value: string | null | undefined) {
  const normalized = value?.trim() ?? ''
  return normalized.length > 0 && !normalized.includes('@')
}

function getGiftCardLocationLabel(chef: DirectoryChef) {
  const discoveryLocation = getDiscoveryLocationLabel(chef.discovery)
  if (discoveryLocation) return discoveryLocation

  const fallbackLocation = [
    chef.directory_listing_location?.city,
    chef.directory_listing_location?.state,
  ]
    .filter(Boolean)
    .join(', ')

  return fallbackLocation || null
}

function hasProfileContext(chef: DirectoryChef) {
  return Boolean(
    chef.tagline ||
    chef.bio ||
    chef.discovery.cuisine_types.length > 0 ||
    chef.discovery.service_types.length > 0 ||
    getGiftCardLocationLabel(chef) ||
    getDiscoveryGuestCountLabel(chef.discovery)
  )
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 3).trimEnd()}...`
}

function getGiftCardProfileSummary(chef: DirectoryChef) {
  const source = chef.tagline || chef.discovery.highlight_text || chef.bio
  if (!source) {
    return 'Gift card page is live. Public profile details are still growing.'
  }

  return truncateText(source, 150)
}

function buildCoverageNote(totalProfiles: number, detailedProfiles: number) {
  if (totalProfiles === 0) {
    return 'No public chef gift card pages are live right now. Browse the full chef directory or book a chef directly if you need help sooner.'
  }

  if (detailedProfiles < totalProfiles) {
    return `${totalProfiles} public chef gift card page${totalProfiles === 1 ? ' is' : 's are'} live right now. ${detailedProfiles} ${detailedProfiles === 1 ? 'currently includes' : 'currently include'} fuller public profile detail on this browse page; the rest have lighter profile information while coverage grows.`
  }

  if (totalProfiles < 8) {
    return `${totalProfiles} public chef gift card page${totalProfiles === 1 ? ' is' : 's are'} live right now. Coverage is still limited on ChefFlow, so this page may look small today.`
  }

  return `${totalProfiles} public chef gift card page${totalProfiles === 1 ? ' is' : 's are'} live right now. Profile depth still varies by chef, so some pages will be more detailed than others.`
}

function sortGiftCardChefs(a: DirectoryChef, b: DirectoryChef) {
  return (
    Number(b.discovery.accepting_inquiries) - Number(a.discovery.accepting_inquiries) ||
    b.discovery.completeness_score - a.discovery.completeness_score ||
    b.discovery.review_count - a.discovery.review_count ||
    a.display_name.localeCompare(b.display_name)
  )
}

function GiftCardChefCard({ chef }: { chef: DirectoryChef }) {
  const locationLabel = getGiftCardLocationLabel(chef)
  const guestCountLabel = getDiscoveryGuestCountLabel(chef.discovery)
  const availabilityLabel = getDiscoveryAvailabilityLabel(chef.discovery)
  const cuisineLabels = chef.discovery.cuisine_types.slice(0, 2).map(getDiscoveryCuisineLabel)
  const serviceLabels = chef.discovery.service_types.slice(0, 2).map(getDiscoveryServiceTypeLabel)
  const labelSet = [...cuisineLabels, ...serviceLabels].filter(
    (value, index, values) => Boolean(value) && values.indexOf(value) === index
  )
  const detailedProfile = hasProfileContext(chef)

  return (
    <Link
      href={`/chef/${chef.slug}/gift-cards`}
      className="group rounded-2xl border border-stone-800/70 bg-stone-900/70 p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-brand-600/50 hover:bg-stone-900"
    >
      <div className="flex items-start gap-4">
        {chef.profile_image_url ? (
          <Image
            src={chef.profile_image_url}
            alt={chef.display_name}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover ring-1 ring-stone-700"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-800 ring-1 ring-stone-700">
            <span className="text-lg font-semibold text-stone-300">
              {chef.display_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-stone-100">{chef.display_name}</h3>
            <span className="rounded-full border border-stone-700 bg-stone-950/70 px-2.5 py-1 text-[11px] font-medium text-stone-300">
              {availabilityLabel}
            </span>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-stone-400">
            {getGiftCardProfileSummary(chef)}
          </p>
        </div>
      </div>

      {labelSet.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {labelSet.map((label) => (
            <span
              key={label}
              className="rounded-full border border-stone-700 bg-stone-950 px-2.5 py-1 text-[11px] font-medium text-stone-300"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-2 text-xs text-stone-500 sm:grid-cols-2">
        <div>
          <p className="font-medium uppercase tracking-[0.08em] text-stone-600">Location</p>
          <p className="mt-1 text-stone-400">{locationLabel || 'Public location not listed yet'}</p>
        </div>
        <div>
          <p className="font-medium uppercase tracking-[0.08em] text-stone-600">Event Fit</p>
          <p className="mt-1 text-stone-400">{guestCountLabel || 'Guest count not listed yet'}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-stone-800/80 pt-4">
        <p className="text-xs text-stone-500">
          {detailedProfile ? 'Chef gift card page' : 'Profile details still growing'}
        </p>
        <span className="text-sm font-medium text-brand-400 transition-colors group-hover:text-brand-300">
          Open gift card page &rarr;
        </span>
      </div>
    </Link>
  )
}

export default async function GiftCardsPage() {
  const allChefs = await getDiscoverableChefs()

  const giftCardChefs = allChefs
    .filter((chef) => chef.slug && hasHumanReadableDisplayName(chef.display_name))
    .sort(sortGiftCardChefs)

  const detailedProfiles = giftCardChefs.filter(hasProfileContext).length
  const coverageNote = buildCoverageNote(giftCardChefs.length, detailedProfiles)

  const collectionStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Private Chef Gift Cards',
    url: `${APP_URL}/gift-cards`,
    description:
      'Browse public chef gift card pages on ChefFlow. Buy online, send by email, and redeem toward a future booked service.',
    hasPart: giftCardChefs.slice(0, 24).map((chef) => ({
      '@type': 'WebPage',
      name: `${chef.display_name} gift card`,
      url: `${APP_URL}/chef/${chef.slug}/gift-cards`,
      description: getGiftCardProfileSummary(chef),
    })),
  }

  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: POLICY_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.title,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.body,
      },
    })),
  }

  const breadcrumbStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: APP_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Gift Cards',
        item: `${APP_URL}/gift-cards`,
      },
    ],
  }

  return (
    <div className="pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />

      <section className="relative overflow-hidden border-b border-stone-800/70">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[340px] bg-gradient-to-b from-brand-600/12 via-brand-600/5 to-transparent" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[760px] -translate-x-1/2 rounded-full bg-brand-700/15 blur-[90px]" />
        <div className="relative mx-auto w-full max-w-5xl px-4 py-16 text-center sm:px-6 md:py-24 lg:px-8">
          <p className="inline-flex rounded-full border border-brand-700/70 bg-stone-900/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            Gift Cards
          </p>
          <h1 className="mt-5 text-4xl font-display tracking-[-0.04em] text-stone-100 md:text-6xl">
            Buy a private chef gift card.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-stone-300 md:text-lg">
            Browse chef-specific gift card pages on ChefFlow. Purchase online, send by email after
            payment, and redeem the code toward a future booked service.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <span className="rounded-full border border-stone-700 bg-stone-900/70 px-4 py-2 text-sm text-stone-200">
              {giftCardChefs.length} public chef gift card page
              {giftCardChefs.length === 1 ? '' : 's'} live
            </span>
            <span className="rounded-full border border-stone-700 bg-stone-900/70 px-4 py-2 text-sm text-stone-200">
              Email delivery after payment
            </span>
            <span className="rounded-full border border-stone-700 bg-stone-900/70 px-4 py-2 text-sm text-stone-200">
              No expiration by default
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-amber-600/20 bg-amber-950/20 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-300">
            Coverage Note
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-300">{coverageNote}</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-stone-800/70 bg-stone-900/60 p-5 shadow-[var(--shadow-card)]">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
              1. Choose a chef
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-300">
              Open a chef&apos;s gift card page and review the real profile detail they have
              published so far.
            </p>
          </article>
          <article className="rounded-2xl border border-stone-800/70 bg-stone-900/60 p-5 shadow-[var(--shadow-card)]">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
              2. Pick an amount
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-300">
              Gift card checkout currently supports amounts from $5 to $2,000 per purchase.
            </p>
          </article>
          <article className="rounded-2xl border border-stone-800/70 bg-stone-900/60 p-5 shadow-[var(--shadow-card)]">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
              3. Send by email
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-300">
              After payment, the recipient receives the code by email and the buyer gets a
              confirmation email.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display tracking-[-0.04em] text-stone-100 md:text-3xl">
              Gift card pages currently live
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-400">
              These are the public chef gift card pages currently visible on ChefFlow. Profile depth
              varies by chef, so some cards will be more complete than others.
            </p>
          </div>
          <Link
            href="/chefs"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 bg-stone-900/70 px-4 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800"
          >
            Browse full chef directory
          </Link>
        </div>

        {giftCardChefs.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {giftCardChefs.map((chef) => (
              <GiftCardChefCard key={chef.id} chef={chef} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-stone-800/70 bg-stone-900/70 p-8 text-center shadow-[var(--shadow-card)]">
            <h3 className="text-xl font-semibold text-stone-100">No gift card pages live yet</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-stone-400">
              Gift cards are not publicly live on ChefFlow right now. You can still browse chefs or
              start a direct booking request.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/chefs"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 bg-stone-900 px-4 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800"
              >
                Browse chefs
              </Link>
              <Link
                href="/book"
                className="inline-flex h-11 items-center justify-center rounded-xl gradient-accent px-4 text-sm font-semibold text-white transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Book a chef
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="border-y border-stone-800/70 bg-stone-900/40">
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
              Before You Buy
            </p>
            <h2 className="mt-3 text-3xl font-display tracking-[-0.04em] text-stone-100">
              Gift card policy, plainly stated
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-400">
              These are the operating basics for gift cards purchased on this page. They are meant
              to make the current flow clearer, not to overpromise platform-wide protections that do
              not exist.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {POLICY_ITEMS.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-stone-800/70 bg-stone-900/70 p-5 shadow-[var(--shadow-card)]"
              >
                <h3 className="text-lg font-semibold text-stone-100">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-400">{item.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/terms"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 bg-stone-900 px-4 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800"
            >
              Review Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 bg-stone-900 px-4 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800"
            >
              Review Privacy Policy
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 pt-10 sm:px-6 lg:px-8">
        <PublicSecondaryEntryCluster
          links={PUBLIC_SECONDARY_ENTRY_CONFIG.gift_cards}
          heading="Need a different path?"
          theme="dark"
        />
      </section>
    </div>
  )
}
