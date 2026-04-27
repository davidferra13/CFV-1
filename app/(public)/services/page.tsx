import type { Metadata } from 'next'
import Link from 'next/link'
import { BreadcrumbJsonLd, JsonLd } from '@/components/seo/json-ld'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { getDiscoverableChefs } from '@/lib/directory/actions'
import { buildServiceTypeFacets, normalizeDirectoryValue } from '@/lib/directory/utils'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'
import { PUBLIC_PRIMARY_CONSUMER_CTA } from '@/lib/public/public-surface-config'
import { absoluteUrl, buildMarketingMetadata } from '@/lib/site/public-site'

export const revalidate = 300

const PRIMARY_SERVICES = [
  {
    label: 'Private Dinners',
    noun: 'private dinner',
    value: 'private_dinner',
    description:
      'At-home dinners, tasting menus, anniversaries, and hosted gatherings published by chefs in the public directory.',
  },
  {
    label: 'Catering',
    noun: 'catering',
    value: 'catering',
    description:
      'Drop-off or staffed event service that chefs have explicitly tagged on their public marketplace profile.',
  },
  {
    label: 'Meal Prep',
    noun: 'meal prep',
    value: 'meal_prep',
    description:
      'Recurring or one-off household meal prep that chefs have chosen to publish as an active service type.',
  },
  {
    label: 'Cooking Classes',
    noun: 'cooking class',
    value: 'cooking_class',
    description:
      'Private lessons, group classes, and team sessions currently tagged on live public chef profiles.',
  },
  {
    label: 'Weddings',
    noun: 'wedding service',
    value: 'wedding',
    description:
      'Rehearsal dinners, receptions, and celebration-focused service that chefs have publicly published.',
  },
  {
    label: 'Corporate Dining',
    noun: 'corporate dining',
    value: 'corporate',
    description:
      'Team meals, client dinners, and office hospitality published as live service tags in the directory.',
  },
] as const

const PRIMARY_SERVICE_TYPE_SET = new Set(
  PRIMARY_SERVICES.map((service) => normalizeDirectoryValue(service.value))
)

type ServiceInventory = (typeof PRIMARY_SERVICES)[number] & {
  liveCount: number
  acceptingCount: number
  primaryHref: string
  primaryLabel: string
}

type ServiceInventorySnapshot = {
  totalChefs: number
  acceptingChefs: number
  categoriesWithSupply: number
  services: ServiceInventory[]
  additionalFacets: Array<{ value: string; label: string; count: number }>
}

function formatChefCount(count: number) {
  return `${count.toLocaleString()} chef${count === 1 ? '' : 's'}`
}

function buildServiceInventoryNarrative(service: ServiceInventory, totalChefs: number) {
  if (service.liveCount > 0) {
    if (service.acceptingCount > 0) {
      return `${formatChefCount(service.liveCount)} currently list ${service.noun} in the public directory, and ${formatChefCount(service.acceptingCount)} are marked as accepting inquiries right now.`
    }

    return `${formatChefCount(service.liveCount)} currently list ${service.noun} in the public directory, but none of those profiles are marked as accepting inquiries right now.`
  }

  if (totalChefs > 0) {
    return `No live public chef profiles are currently tagged for ${service.noun}. The fallback here is the broader live directory or the booking request path instead of claiming supply that is not published.`
  }

  return `No public chef profiles are currently live in the directory, so this category falls back to the booking request path while marketplace supply grows.`
}

async function getServiceInventorySnapshot(): Promise<ServiceInventorySnapshot> {
  const chefs = await getDiscoverableChefs()
  const serviceFacets = buildServiceTypeFacets(chefs)
  const facetMap = new Map(
    serviceFacets.map((facet) => [normalizeDirectoryValue(facet.value), facet.count])
  )
  const acceptingMap = new Map<string, number>()
  const acceptingChefs = new Set<string>()

  for (const chef of chefs) {
    if (chef.discovery.accepting_inquiries) {
      acceptingChefs.add(chef.id)
    }

    const seenTypes = new Set<string>()

    for (const serviceType of chef.discovery.service_types) {
      const normalizedType = normalizeDirectoryValue(serviceType)
      if (!normalizedType || seenTypes.has(normalizedType)) continue
      seenTypes.add(normalizedType)

      if (chef.discovery.accepting_inquiries) {
        acceptingMap.set(normalizedType, (acceptingMap.get(normalizedType) ?? 0) + 1)
      }
    }
  }

  const services: ServiceInventory[] = PRIMARY_SERVICES.map((service) => {
    const liveCount = facetMap.get(service.value) ?? 0
    const acceptingCount = acceptingMap.get(service.value) ?? 0

    if (liveCount > 0) {
      return {
        ...service,
        liveCount,
        acceptingCount,
        primaryHref: `/chefs?serviceType=${service.value}`,
        primaryLabel: `Browse ${formatChefCount(liveCount)}`,
      }
    }

    if (chefs.length > 0) {
      return {
        ...service,
        liveCount,
        acceptingCount,
        primaryHref: '/chefs',
        primaryLabel: `Browse all ${formatChefCount(chefs.length)}`,
      }
    }

    return {
      ...service,
      liveCount,
      acceptingCount,
      primaryHref: PUBLIC_PRIMARY_CONSUMER_CTA.href,
      primaryLabel: PUBLIC_PRIMARY_CONSUMER_CTA.label,
    }
  })

  return {
    totalChefs: chefs.length,
    acceptingChefs: acceptingChefs.size,
    categoriesWithSupply: services.filter((service) => service.liveCount > 0).length,
    services,
    additionalFacets: serviceFacets.filter(
      (facet) =>
        facet.count > 0 && !PRIMARY_SERVICE_TYPE_SET.has(normalizeDirectoryValue(facet.value))
    ),
  }
}

function buildMetadataDescription(snapshot: ServiceInventorySnapshot) {
  if (snapshot.totalChefs > 0) {
    return `Browse ${snapshot.totalChefs.toLocaleString()} live public chef profiles on ChefFlow. See exact tagged supply counts for private dinners, catering, meal prep, cooking classes, weddings, and corporate dining.`
  }

  return 'Browse ChefFlow service categories and use the booking request path while public chef profile supply grows.'
}

function buildServicesJsonLd(snapshot: ServiceInventorySnapshot) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Chef Services',
    url: absoluteUrl('/services'),
    description: buildMetadataDescription(snapshot),
    isPartOf: {
      '@type': 'WebSite',
      name: 'ChefFlow',
      url: absoluteUrl('/'),
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListOrder: 'https://schema.org/ItemListUnordered',
      numberOfItems: snapshot.services.length,
      itemListElement: snapshot.services.map((service, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absoluteUrl(service.primaryHref),
        name: service.label,
        item: {
          '@type': 'Service',
          name: service.label,
          description: service.description,
          additionalProperty: [
            {
              '@type': 'PropertyValue',
              name: 'Live public chef profiles',
              value: service.liveCount,
            },
            {
              '@type': 'PropertyValue',
              name: 'Currently accepting inquiries',
              value: service.acceptingCount,
            },
          ],
        },
      })),
    },
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const snapshot = await getServiceInventorySnapshot()
  const description = buildMetadataDescription(snapshot)

  return {
    ...buildMarketingMetadata({
      title: 'Chef Services | Live Private Chef Supply',
      description,
      path: '/services',
      imagePath: '/api/og/services',
      imageAlt: 'ChefFlow services inventory preview',
      openGraphTitle: 'Chef Services | Live Public Chef Supply',
      twitterTitle: 'Chef Services | Live Public Chef Supply',
      twitterCard: 'summary_large_image',
    }),
    keywords: [
      'private chef services',
      'private dinner chef',
      'meal prep chef',
      'catering chef',
      'cooking class chef',
      'wedding chef',
      'corporate dining chef',
    ],
  }
}

function ServiceCard({ service, totalChefs }: { service: ServiceInventory; totalChefs: number }) {
  const hasLiveSupply = service.liveCount > 0
  const showBookCta = totalChefs > 0 || hasLiveSupply

  return (
    <article className="flex h-full flex-col rounded-2xl border border-stone-800/70 bg-stone-900/50 p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
            Service Category
          </p>
          <h2 className="mt-2 text-xl font-semibold text-stone-100">{service.label}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-stone-700 bg-stone-950/80 px-3 py-1 text-xs font-medium text-stone-200">
            {service.liveCount.toLocaleString()} of {totalChefs.toLocaleString()} live chefs
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              service.acceptingCount > 0
                ? 'border-emerald-700/50 bg-emerald-950/40 text-emerald-200'
                : hasLiveSupply
                  ? 'border-amber-700/40 bg-amber-950/30 text-amber-200'
                  : 'border-stone-700 bg-stone-950/80 text-stone-300'
            }`}
          >
            {service.acceptingCount > 0
              ? `${service.acceptingCount.toLocaleString()} accepting inquiries`
              : hasLiveSupply
                ? 'No profiles marked accepting inquiries'
                : 'Fallback active'}
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-stone-400">{service.description}</p>
      <p className="mt-4 text-sm leading-relaxed text-stone-300">
        {buildServiceInventoryNarrative(service, totalChefs)}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={service.primaryHref}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          {service.primaryLabel}
        </Link>
        {showBookCta && (
          <Link
            href={PUBLIC_PRIMARY_CONSUMER_CTA.href}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 bg-stone-900/70 px-4 text-sm font-medium text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100"
          >
            {PUBLIC_PRIMARY_CONSUMER_CTA.label}
          </Link>
        )}
      </div>
    </article>
  )
}

export default async function ServicesPage() {
  const snapshot = await getServiceInventorySnapshot()

  return (
    <main>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: absoluteUrl('/') },
          { name: 'Services', url: absoluteUrl('/services') },
        ]}
      />
      <JsonLd data={buildServicesJsonLd(snapshot)} />

      <section className="border-b border-stone-800/30">
        <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-16 sm:px-6 md:pt-24 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="mb-4 flex items-center gap-2 text-xs text-stone-500"
          >
            <Link href="/" className="transition-colors hover:text-stone-300">
              Home
            </Link>
            <span>/</span>
            <span className="text-stone-400">Services</span>
          </nav>

          <p className="inline-flex rounded-full border border-brand-700/60 bg-brand-950/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-300">
            Live Service Inventory
          </p>
          <h1 className="mt-5 text-4xl font-display tracking-[-0.04em] text-stone-100 md:text-5xl">
            Browse chefs by published service type.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-stone-300">
            This page is tied to the live public chef directory, not a generic service list. Counts
            below only include approved public chef profiles that have actually published each
            service tag.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <span className="rounded-full border border-stone-700 bg-stone-900/70 px-4 py-2 text-sm text-stone-200">
              {snapshot.totalChefs.toLocaleString()} live public chef
              {snapshot.totalChefs === 1 ? ' profile' : ' profiles'}
            </span>
            <span className="rounded-full border border-stone-700 bg-stone-900/70 px-4 py-2 text-sm text-stone-200">
              {snapshot.acceptingChefs.toLocaleString()} currently accepting inquiries
            </span>
            <span className="rounded-full border border-stone-700 bg-stone-900/70 px-4 py-2 text-sm text-stone-200">
              {snapshot.categoriesWithSupply.toLocaleString()} of{' '}
              {PRIMARY_SERVICES.length.toLocaleString()} headline categories have live tagged supply
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-amber-700/30 bg-amber-950/15 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">
            How Counts Are Sourced
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-300">
            Counts come from the current live <code>/chefs</code> directory. A chef only appears in
            a category after publishing that service on their marketplace or directory profile. If a
            category has no tagged supply, the fallback here is the broader live directory or the
            booking request path instead of inventing inventory.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          {snapshot.services.map((service) => (
            <ServiceCard key={service.value} service={service} totalChefs={snapshot.totalChefs} />
          ))}
        </div>
      </section>

      {snapshot.additionalFacets.length > 0 && (
        <section className="mx-auto w-full max-w-5xl px-4 pb-14 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-stone-800/70 bg-stone-900/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              Other Live Tags
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-100">
              Additional service tags are already published on live profiles.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-400">
              These tags are currently visible in the public directory even though they are not part
              of the six headline categories above.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {snapshot.additionalFacets.map((facet) => (
                <Link
                  key={facet.value}
                  href={`/chefs?serviceType=${facet.value}`}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-700 bg-stone-950/80 px-4 py-2 text-sm font-medium text-stone-200 transition-colors hover:border-brand-600/50 hover:text-white"
                >
                  <span>{facet.label}</span>
                  <span className="text-stone-500">{facet.count.toLocaleString()}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-y border-stone-800/30">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-14 text-center sm:px-6 lg:px-8">
          <p className="text-base text-stone-300">
            Need a chef even when a category is thin? The booking request path stays available while
            public profile supply fills in.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={PUBLIC_PRIMARY_CONSUMER_CTA.href}
              className="inline-flex h-12 items-center justify-center rounded-xl gradient-accent px-6 text-sm font-semibold text-white transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] shadow-lg"
            >
              {PUBLIC_PRIMARY_CONSUMER_CTA.label}
            </Link>
            {snapshot.totalChefs > 0 && (
              <Link
                href="/chefs"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-stone-700 bg-stone-900/60 px-6 text-sm font-medium text-stone-300 transition-all hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100"
              >
                Browse all {formatChefCount(snapshot.totalChefs)}
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
        <PublicSecondaryEntryCluster links={PUBLIC_SECONDARY_ENTRY_CONFIG.services} theme="dark" />
      </section>
    </main>
  )
}
