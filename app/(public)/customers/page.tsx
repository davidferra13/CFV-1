import type { Metadata } from 'next'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { CUSTOMER_STORIES } from '@/lib/marketing/customer-stories'
import { LAUNCH_MODE, PRIMARY_SIGNUP_HREF, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Customer Stories | ChefFlow',
  description:
    'Read how private chefs are reducing admin overhead, improving margins, and scaling client service with ChefFlow.',
  openGraph: {
    title: 'ChefFlow Customer Stories',
    description:
      'Real workflows and measurable outcomes from chefs using ChefFlow across private dining and meal prep.',
    url: `${BASE_URL}/customers`,
    siteName: 'ChefFlow',
    type: 'website',
  },
  alternates: {
    canonical: `${BASE_URL}/customers`,
  },
}

export default function CustomersPage() {
  const isBeta = LAUNCH_MODE === 'beta'
  const customersStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'ChefFlow Customer Stories',
    url: `${BASE_URL}/customers`,
    hasPart: CUSTOMER_STORIES.map((story) => ({
      '@type': 'Article',
      headline: story.title,
      description: story.summary,
      url: `${BASE_URL}/customers/${story.slug}`,
      author: {
        '@type': 'Person',
        name: story.chefName,
      },
    })),
  }

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(customersStructuredData) }}
      />
      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[380px] w-[720px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[80px]" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6 md:py-24 lg:px-8">
          <p className="inline-flex rounded-full border border-brand-700 bg-stone-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            Customer Proof
          </p>
          <h1 className="mt-5 text-4xl font-display tracking-tight text-stone-100 md:text-6xl">
            How chefs are using ChefFlow in the real world.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-stone-300 md:text-lg">
            These stories show the operating changes, not just feature lists. Each one includes
            workflow changes and measurable outcomes over the first months.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {CUSTOMER_STORIES.map((story) => (
            <article
              key={story.slug}
              className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6 shadow-[var(--shadow-card)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-300">
                {story.timeline}
              </p>
              <h2 className="mt-3 text-xl font-semibold text-stone-100">{story.title}</h2>
              <p className="mt-2 text-sm text-stone-400">
                {story.chefName} - {story.location}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-stone-300">{story.summary}</p>

              <div className="mt-5 space-y-2">
                {story.metrics.slice(0, 2).map((metric) => (
                  <div
                    key={metric.label}
                    className="flex items-center justify-between rounded-lg border border-stone-700 bg-stone-900 px-3 py-2"
                  >
                    <span className="text-xs text-stone-400">{metric.label}</span>
                    <span className="text-sm font-semibold text-brand-300">{metric.delta}</span>
                  </div>
                ))}
              </div>

              <TrackedLink
                href={`/customers/${story.slug}`}
                analyticsName="customers_story_open"
                analyticsProps={{ story_slug: story.slug }}
                className="mt-6 inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Read full story
              </TrackedLink>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-stone-700/50 bg-stone-900/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 text-center sm:px-6 md:py-20 lg:px-8">
          <h2 className="text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
            Ready to build your own operating baseline?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-300">
            {isBeta
              ? 'Join the closed beta and help shape the product with direct feedback loops.'
              : 'Start with a free trial and implement one consistent workflow from inquiry to payout.'}
          </p>
          <TrackedLink
            href={PRIMARY_SIGNUP_HREF}
            analyticsName="customers_bottom_primary_cta"
            analyticsProps={{ launch_mode: LAUNCH_MODE }}
            className="mt-8 inline-flex items-center rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {PRIMARY_SIGNUP_LABEL}
          </TrackedLink>
        </div>
      </section>
    </div>
  )
}
