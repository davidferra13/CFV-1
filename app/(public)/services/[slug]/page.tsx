import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BreadcrumbJsonLd, JsonLd } from '@/components/seo/json-ld'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { getDiscoverableChefs } from '@/lib/directory/actions'
import { buildServiceTypeFacets, normalizeDirectoryValue } from '@/lib/directory/utils'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'
import { PUBLIC_PRIMARY_CONSUMER_CTA } from '@/lib/public/public-surface-config'
import { absoluteUrl, buildMarketingMetadata } from '@/lib/site/public-site'
import { getServiceIntentPage, SERVICE_INTENT_PAGES } from '../_intent-pages'

export const revalidate = 300

type ServiceIntentRouteProps = {
  params: {
    slug: string
  }
}

export function generateStaticParams() {
  return SERVICE_INTENT_PAGES.map((page) => ({ slug: page.slug }))
}

export async function generateMetadata({ params }: ServiceIntentRouteProps): Promise<Metadata> {
  const page = getServiceIntentPage(params.slug)
  if (!page) return {}

  return {
    ...buildMarketingMetadata({
      title: page.seoTitle,
      description: page.metaDescription,
      path: `/services/${page.slug}`,
      imagePath: '/social/chefflow-home.png',
      imageAlt: `${page.label} on ChefFlow`,
    }),
    keywords: page.queryExamples,
  }
}

async function getIntentSupply(serviceType: string) {
  const chefs = await getDiscoverableChefs()
  const normalizedType = normalizeDirectoryValue(serviceType)
  const liveChefs = chefs.filter((chef) =>
    chef.discovery.service_types.some((type) => normalizeDirectoryValue(type) === normalizedType)
  )
  const acceptingChefs = liveChefs.filter((chef) => chef.discovery.accepting_inquiries)
  const facets = buildServiceTypeFacets(chefs)
  const serviceFacet = facets.find(
    (facet) => normalizeDirectoryValue(facet.value) === normalizedType
  )

  return {
    totalChefs: chefs.length,
    liveCount: serviceFacet?.count ?? liveChefs.length,
    acceptingCount: acceptingChefs.length,
  }
}

function buildIntentJsonLd(page: NonNullable<ReturnType<typeof getServiceIntentPage>>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: page.label,
    description: page.metaDescription,
    url: absoluteUrl(`/services/${page.slug}`),
    provider: {
      '@type': 'Organization',
      name: 'ChefFlow',
      url: absoluteUrl('/'),
    },
    areaServed: 'United States',
  }
}

export default async function ServiceIntentPage({ params }: ServiceIntentRouteProps) {
  const page = getServiceIntentPage(params.slug)
  if (!page) notFound()

  const supply = await getIntentSupply(page.serviceType)
  const hasTaggedSupply = supply.liveCount > 0
  const browseHref = hasTaggedSupply ? `/chefs?serviceType=${page.serviceType}` : '/chefs'
  const browseLabel = hasTaggedSupply
    ? `Browse ${supply.liveCount.toLocaleString()} tagged profile${
        supply.liveCount === 1 ? '' : 's'
      }`
    : 'Browse all chef profiles'

  return (
    <main>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: absoluteUrl('/') },
          { name: 'Services', url: absoluteUrl('/services') },
          { name: page.label, url: absoluteUrl(`/services/${page.slug}`) },
        ]}
      />
      <JsonLd data={buildIntentJsonLd(page)} />

      <section className="border-b border-stone-800/60">
        <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-16 sm:px-6 md:pt-24 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="mb-4 flex items-center gap-2 text-xs text-stone-500"
          >
            <Link href="/" className="transition-colors hover:text-stone-300">
              Home
            </Link>
            <span>/</span>
            <Link href="/services" className="transition-colors hover:text-stone-300">
              Services
            </Link>
            <span>/</span>
            <span className="text-stone-400">{page.label}</span>
          </nav>

          <p className="inline-flex rounded-full border border-brand-700/60 bg-brand-950/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-300">
            Search-intent landing page
          </p>
          <h1 className="mt-5 text-4xl font-display tracking-tight text-stone-100 md:text-5xl">
            {page.h1}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-stone-300">
            {page.consumerPromise}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <span className="rounded-full border border-stone-700 bg-stone-900/70 px-4 py-2 text-sm text-stone-200">
              {supply.liveCount.toLocaleString()} profile
              {supply.liveCount === 1 ? '' : 's'} tagged for this intent
            </span>
            <span className="rounded-full border border-stone-700 bg-stone-900/70 px-4 py-2 text-sm text-stone-200">
              {supply.acceptingCount.toLocaleString()} accepting inquiries
            </span>
            <span className="rounded-full border border-stone-700 bg-stone-900/70 px-4 py-2 text-sm text-stone-200">
              {supply.totalChefs.toLocaleString()} total live chef profile
              {supply.totalChefs === 1 ? '' : 's'}
            </span>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={browseHref}
              className="inline-flex h-12 items-center justify-center rounded-xl gradient-accent px-6 text-sm font-semibold text-white glow-hover shadow-lg"
            >
              {browseLabel}
            </Link>
            <Link
              href={PUBLIC_PRIMARY_CONSUMER_CTA.href}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-stone-700 bg-stone-900/70 px-6 text-sm font-medium text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100"
            >
              Start one request
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-2 lg:px-8">
        <article className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5">
          <h2 className="text-xl font-semibold text-stone-100">Good fit for</h2>
          <ul className="mt-4 space-y-2 text-sm text-stone-300">
            {page.bestFor.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </article>
        <article className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5">
          <h2 className="text-xl font-semibold text-stone-100">Searches this page covers</h2>
          <ul className="mt-4 space-y-2 text-sm text-stone-300">
            {page.queryExamples.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-amber-700/30 bg-amber-950/15 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">
            Supply note
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-300">
            Counts come from live public chef profile service tags. When this category is thin,
            ChefFlow routes you to the broader directory or the booking request path instead of
            claiming local availability that is not published.
          </p>
        </div>
        <PublicSecondaryEntryCluster links={PUBLIC_SECONDARY_ENTRY_CONFIG.services} theme="dark" />
      </section>
    </main>
  )
}
