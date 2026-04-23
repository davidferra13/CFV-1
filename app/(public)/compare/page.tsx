import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { BreadcrumbJsonLd, JsonLd } from '@/components/seo/json-ld'
import { COMPARE_PAGES } from '@/lib/marketing/compare-pages'
import { LAUNCH_MODE, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'
import { readMarketingSourceFromSearchParams } from '@/lib/marketing/source-links'
import { buildMarketingSignupHref } from '@/lib/marketing/signup-links'
import { buildOperatorWalkthroughHref } from '@/lib/marketing/walkthrough-links'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
const COMPARE_OG_IMAGE = `${BASE_URL}/compare/opengraph-image`
const COMPARE_TWITTER_IMAGE = `${BASE_URL}/compare/twitter-image`

const COMPARE_HUB_STEPS = [
  {
    title: 'Start with the stack you already run',
    detail:
      'Each guide begins from a real alternative so you can compare ChefFlow against the workflow your team already understands.',
  },
  {
    title: 'Check migration friction before you switch',
    detail:
      'The comparisons focus on fit, handoff continuity, and migration scope instead of broad unsupported claims.',
  },
  {
    title: 'Choose the next proof step',
    detail:
      'Use the linked workflow proof and walkthrough path when you need more than a feature table before making a change.',
  },
] as const

export const metadata: Metadata = {
  title: 'Compare ChefFlow for Private Chef Operations',
  description:
    'Compare ChefFlow against spreadsheets and broad CRM tools for private chef operations. Review workflow tradeoffs, migration guidance, and next-step evaluation paths.',
  openGraph: {
    title: 'ChefFlow Comparison Hub',
    description:
      'Private-chef focused comparisons with migration guidance, fit framing, and clear next-step evaluation paths.',
    url: `${BASE_URL}/compare`,
    siteName: 'ChefFlow',
    type: 'website',
    images: [
      {
        url: COMPARE_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'ChefFlow comparison hub preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChefFlow Comparison Hub',
    description:
      'Compare ChefFlow against spreadsheets and broad CRM tools with migration guidance and a clear walkthrough path.',
    images: [COMPARE_TWITTER_IMAGE],
  },
  alternates: {
    canonical: `${BASE_URL}/compare`,
  },
}

type CompareIndexPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function CompareIndexPage({ searchParams }: CompareIndexPageProps) {
  const isBeta = LAUNCH_MODE === 'beta'
  const marketingSource = readMarketingSourceFromSearchParams((await searchParams) ?? undefined)
  const compareStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'ChefFlow Comparison Guides',
    description:
      'Compare ChefFlow against spreadsheets and generalized CRM tools for private chef operations.',
    url: `${BASE_URL}/compare`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'ChefFlow',
      url: BASE_URL,
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListOrder: 'https://schema.org/ItemListUnordered',
      numberOfItems: COMPARE_PAGES.length,
      itemListElement: COMPARE_PAGES.map((page, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: page.title,
        description: page.summary,
        url: `${BASE_URL}/compare/${page.slug}`,
      })),
    },
    hasPart: COMPARE_PAGES.map((page) => ({
      '@type': 'Article',
      headline: page.title,
      description: page.summary,
      url: `${BASE_URL}/compare/${page.slug}`,
    })),
  }

  return (
    <div>
      <PublicPageView
        pageName="compare_index"
        properties={{
          section: 'public_growth',
          ...(marketingSource.sourcePage ? { source_page: marketingSource.sourcePage } : {}),
          ...(marketingSource.sourceCta ? { source_cta: marketingSource.sourceCta } : {}),
        }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: BASE_URL },
          { name: 'Compare', url: `${BASE_URL}/compare` },
        ]}
      />
      <JsonLd data={compareStructuredData} />

      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[700px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[80px]" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-stone-500">
            <Link href="/" className="transition-colors hover:text-stone-300">
              Home
            </Link>
            <span>/</span>
            <span className="text-stone-400">Compare</span>
          </nav>

          <div className="mt-6 max-w-4xl">
            <p className="inline-flex rounded-full border border-brand-700 bg-stone-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
              Comparison Hub
            </p>
            <h1 className="mt-5 text-4xl font-display tracking-tight text-stone-100 md:text-6xl">
              Compare ChefFlow against the tools you already use.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-stone-300 md:text-lg">
              These guides are built for private chef operators deciding whether to stay on generic
              stacks or move to a chef-specific operating system.
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-400">
              Start with the tool you run today, check the migration path, then use the proof or
              walkthrough route if you need sharper buyer confidence before switching.
            </p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
              <TrackedLink
                href="/for-operators"
                analyticsName="compare_index_proof_cta"
                analyticsProps={{ section: 'hero' }}
                className="inline-flex items-center rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                See real workflow proof
              </TrackedLink>
              <TrackedLink
                href={buildOperatorWalkthroughHref({
                  sourcePage: 'compare_index',
                  sourceCta: 'hero_walkthrough',
                })}
                analyticsName="compare_index_walkthrough_cta"
                analyticsProps={{ section: 'hero' }}
                className="inline-flex items-center rounded-lg border border-stone-600 bg-stone-900 px-6 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
              >
                Request operator walkthrough
              </TrackedLink>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {COMPARE_HUB_STEPS.map((step) => (
            <article
              key={step.title}
              className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6 shadow-[var(--shadow-card)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                How To Use This Hub
              </p>
              <h2 className="mt-3 text-xl font-semibold text-stone-100">{step.title}</h2>
              <p className="mt-3 text-sm leading-7 text-stone-300">{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            Compare Guides
          </p>
          <h2 className="mt-3 text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
            Start with the system your team is actually deciding against.
          </h2>
          <p className="mt-4 text-sm leading-7 text-stone-400">
            Every guide includes fit framing, workflow tradeoffs, migration guidance, and a next
            step for a live evaluation.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {COMPARE_PAGES.map((page) => (
            <article
              key={page.slug}
              className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6 shadow-[var(--shadow-card)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-300">
                vs {page.alternativeName}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-stone-100">{page.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-stone-300">{page.summary}</p>

              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                Best Fit
              </p>
              <ul className="mt-3 space-y-2">
                {page.idealFor.slice(0, 2).map((item) => (
                  <li key={item} className="text-sm text-stone-300">
                    - {item}
                  </li>
                ))}
              </ul>

              <TrackedLink
                href={`/compare/${page.slug}`}
                analyticsName="compare_index_open_guide"
                analyticsProps={{ compare_slug: page.slug }}
                className="mt-6 inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Read comparison
              </TrackedLink>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-stone-700/50 bg-stone-900/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
              Choose the next proof step.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-stone-300">
              The comparison pages narrow the decision. These next steps help you validate the
              switch against a real workflow before you commit.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-stone-700 bg-stone-950/70 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                Walkthrough
              </p>
              <h3 className="mt-3 text-xl font-semibold text-stone-100">Request a live review</h3>
              <p className="mt-3 text-sm leading-7 text-stone-300">
                Use the operator walkthrough if you want the comparison mapped to your current
                pipeline, event handoffs, or migration concerns.
              </p>
              <TrackedLink
                href={buildOperatorWalkthroughHref({
                  sourcePage: 'compare_index',
                  sourceCta: 'bottom_walkthrough',
                })}
                analyticsName="compare_index_bottom_walkthrough"
                analyticsProps={{ section: 'compare_bottom' }}
                className="mt-5 inline-flex items-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Request operator walkthrough
              </TrackedLink>
            </article>

            <article className="rounded-2xl border border-stone-700 bg-stone-950/70 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                Proof
              </p>
              <h3 className="mt-3 text-xl font-semibold text-stone-100">See the workflow first</h3>
              <p className="mt-3 text-sm leading-7 text-stone-300">
                Review the operator proof page for real screens and the live workflow path these
                guides are pointing to.
              </p>
              <TrackedLink
                href="/for-operators"
                analyticsName="compare_index_bottom_proof"
                analyticsProps={{ section: 'compare_bottom' }}
                className="mt-5 inline-flex items-center rounded-lg border border-stone-600 bg-stone-900 px-5 py-2.5 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
              >
                See workflow proof
              </TrackedLink>
            </article>

            <article className="rounded-2xl border border-stone-700 bg-stone-950/70 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                Pilot
              </p>
              <h3 className="mt-3 text-xl font-semibold text-stone-100">Start with one pipeline</h3>
              <p className="mt-3 text-sm leading-7 text-stone-300">
                If the fit already looks clear, run one live workflow in ChefFlow and keep the old
                system read-only until the new baseline is stable.
              </p>
              <TrackedLink
                href={buildMarketingSignupHref({
                  sourcePage: 'compare_index',
                  sourceCta: 'bottom_pilot',
                })}
                analyticsName="compare_index_primary_cta"
                analyticsProps={{ launch_mode: LAUNCH_MODE, section: 'compare_bottom' }}
                className="mt-5 inline-flex items-center rounded-lg border border-stone-600 bg-stone-900 px-5 py-2.5 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
              >
                {isBeta ? 'Join beta waitlist' : PRIMARY_SIGNUP_LABEL}
              </TrackedLink>
            </article>
          </div>
        </div>
      </section>
    </div>
  )
}
