import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BreadcrumbJsonLd, JsonLd } from '@/components/seo/json-ld'
import {
  buildPublicCuisinePage,
  getCanonicalCuisinePageSlug,
  listPublicCuisinePages,
} from '@/lib/discovery/cuisine-pages'
import { buildMarketingMetadata } from '@/lib/site/public-site'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

type PageProps = {
  params: {
    slug: string
  }
}

function cuisineHref(slug: string) {
  return `/cuisines/${slug}`
}

export function generateStaticParams() {
  return listPublicCuisinePages().map((page) => ({ slug: page.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = buildPublicCuisinePage(params.slug)

  if (!page) {
    return {
      title: 'Cuisine | ChefFlow',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  return {
    ...buildMarketingMetadata({
      title: page.title,
      description: page.description,
      path: cuisineHref(page.slug),
      imagePath: '/social/chefflow-home.png',
      imageAlt: `${page.name} food experiences on ChefFlow`,
      twitterCard: 'summary_large_image',
    }),
    keywords: [
      `${page.name} private chef`,
      `${page.name} chef near me`,
      `${page.name} catering`,
      `${page.name} food near me`,
    ],
  }
}

export default function CuisineLandingPage({ params }: PageProps) {
  const canonicalSlug = getCanonicalCuisinePageSlug(params.slug)
  if (!canonicalSlug) notFound()

  if (canonicalSlug !== params.slug) {
    redirect(cuisineHref(canonicalSlug))
  }

  const page = buildPublicCuisinePage(canonicalSlug)
  if (!page) notFound()

  const breadcrumbItems = [
    { name: 'Home', url: APP_URL },
    { name: page.name, url: `${APP_URL}/cuisines/${page.slug}` },
  ]

  const cuisineLinks = [...page.children, ...page.related]
  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: page.title,
    description: page.description,
    url: `${APP_URL}/cuisines/${page.slug}`,
    about: {
      '@type': 'Thing',
      name: page.name,
    },
    mainEntity: {
      '@type': 'ItemList',
      name: `${page.name} cuisine paths`,
      itemListElement: cuisineLinks.slice(0, 12).map((cuisine, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Thing',
          name: cuisine.name,
          url: `${APP_URL}${cuisineHref(cuisine.slug)}`,
        },
      })),
    },
  }

  return (
    <div className="min-h-screen">
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <JsonLd data={collectionJsonLd} />

      <section className="border-b border-stone-800/50">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-6 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="mb-4 flex items-center gap-2 text-xs text-stone-500"
          >
            <Link href="/" className="transition-colors hover:text-stone-300">
              Home
            </Link>
            <span>/</span>
            <span className="text-stone-400">{page.name}</span>
          </nav>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
            {page.region} / {page.subregion}
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight text-stone-100 md:text-6xl">
            {page.name} private chefs and food experiences
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-stone-300 md:text-lg">
            {page.intro}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={page.chefHref}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Browse {page.name} chefs
            </Link>
            <Link
              href={page.nearbyHref}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-stone-700 bg-stone-950/70 px-5 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-900"
            >
              Find {page.name} nearby
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.7fr)]">
          <div className="rounded-2xl border border-stone-700 bg-stone-900/70 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
              Start with the right path
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Link
                href={page.chefHref}
                className="rounded-2xl border border-stone-700 bg-stone-950/70 p-5 transition-colors hover:border-brand-700/50 hover:bg-stone-950"
              >
                <h2 className="text-lg font-semibold text-stone-100">Private chefs</h2>
                <p className="mt-2 text-sm leading-6 text-stone-400">
                  Compare live chef profiles for dinners, events, catering, classes, and household
                  cooking.
                </p>
              </Link>
              <Link
                href={page.nearbyHref}
                className="rounded-2xl border border-stone-700 bg-stone-950/70 p-5 transition-colors hover:border-brand-700/50 hover:bg-stone-950"
              >
                <h2 className="text-lg font-semibold text-stone-100">Nearby operators</h2>
                <p className="mt-2 text-sm leading-6 text-stone-400">
                  Browse restaurants, bakeries, caterers, food trucks, markets, and other local food
                  businesses.
                </p>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-700 bg-stone-900/70 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
              Registry detail
            </p>
            <dl className="mt-5 space-y-4">
              <div>
                <dt className="text-xs uppercase tracking-wide text-stone-500">Cuisine</dt>
                <dd className="mt-1 text-sm font-semibold text-stone-100">{page.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-stone-500">Region</dt>
                <dd className="mt-1 text-sm text-stone-300">
                  {page.region} / {page.subregion}
                </dd>
              </div>
              {page.ancestors.length > 0 && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-stone-500">Parent cuisine</dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {page.ancestors.map((ancestor) => (
                      <Link
                        key={ancestor.slug}
                        href={cuisineHref(ancestor.slug)}
                        className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1 text-xs text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100"
                      >
                        {ancestor.name}
                      </Link>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {page.children.length > 0 && (
          <div className="mt-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
              Explore child cuisines
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {page.children.map((cuisine) => (
                <Link
                  key={cuisine.slug}
                  href={cuisineHref(cuisine.slug)}
                  className="rounded-full border border-stone-700 bg-stone-900/70 px-4 py-2 text-sm font-medium text-stone-300 transition-colors hover:border-brand-700/50 hover:text-stone-100"
                >
                  {cuisine.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {page.related.length > 0 && (
          <div className="mt-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
              Related cuisine pages
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {page.related.map((cuisine) => (
                <Link
                  key={cuisine.slug}
                  href={cuisineHref(cuisine.slug)}
                  className="rounded-full border border-stone-700 bg-stone-900/70 px-4 py-2 text-sm font-medium text-stone-300 transition-colors hover:border-brand-700/50 hover:text-stone-100"
                >
                  {cuisine.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
