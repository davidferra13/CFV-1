import type { Metadata } from 'next'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { COMPARE_PAGES } from '@/lib/marketing/compare-pages'
import { LAUNCH_MODE, PRIMARY_SIGNUP_HREF, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Compare ChefFlow | Alternatives for Private Chefs',
  description:
    'Compare ChefFlow against spreadsheets and popular CRM tools for private chef operations. See workflow tradeoffs and migration guidance.',
  openGraph: {
    title: 'ChefFlow Comparison Guides',
    description:
      'Private-chef focused comparisons: ChefFlow vs spreadsheets and generalized CRM platforms.',
    url: `${BASE_URL}/compare`,
    siteName: 'ChefFlow',
    type: 'website',
  },
  alternates: {
    canonical: `${BASE_URL}/compare`,
  },
}

export default function CompareIndexPage() {
  const isBeta = LAUNCH_MODE === 'beta'
  const compareStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'ChefFlow Comparison Guides',
    url: `${BASE_URL}/compare`,
    hasPart: COMPARE_PAGES.map((page) => ({
      '@type': 'Article',
      headline: page.title,
      description: page.summary,
      url: `${BASE_URL}/compare/${page.slug}`,
    })),
  }

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(compareStructuredData) }}
      />

      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[700px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[80px]" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6 md:py-24 lg:px-8">
          <p className="inline-flex rounded-full border border-brand-700 bg-stone-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            Comparison Hub
          </p>
          <h1 className="mt-5 text-4xl font-display tracking-tight text-stone-100 md:text-6xl">
            Compare ChefFlow against the tools you already use.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-stone-300 md:text-lg">
            These guides are built for private chef operators deciding whether to stay on generic
            stacks or move to a chef-specific operating system.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
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

              <ul className="mt-4 space-y-2">
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
                Open guide
              </TrackedLink>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-stone-700/50 bg-stone-900/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 text-center sm:px-6 md:py-20 lg:px-8">
          <h2 className="text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
            Need deeper answers before you switch?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-300">
            Review common implementation questions, then start with a controlled rollout.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedLink
              href="/faq"
              analyticsName="compare_index_faq"
              analyticsProps={{ section: 'compare_bottom' }}
              className="inline-flex items-center rounded-lg border border-stone-600 bg-stone-900 px-7 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
            >
              Read FAQ
            </TrackedLink>
            <TrackedLink
              href={PRIMARY_SIGNUP_HREF}
              analyticsName="compare_index_primary_cta"
              analyticsProps={{ launch_mode: LAUNCH_MODE, section: 'compare_bottom' }}
              className="inline-flex items-center rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              {isBeta ? 'Join beta waitlist' : PRIMARY_SIGNUP_LABEL}
            </TrackedLink>
          </div>
        </div>
      </section>
    </div>
  )
}
