import type { Metadata } from 'next'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { CUSTOMER_STORIES, getCustomerStory } from '@/lib/marketing/customer-stories'
import { LAUNCH_MODE, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'
import { buildMarketingSignupHref } from '@/lib/marketing/signup-links'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

type Props = {
  params: {
    slug: string
  }
}

export function generateStaticParams() {
  return CUSTOMER_STORIES.map((story) => ({ slug: story.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const story = getCustomerStory(params.slug)

  if (!story) {
    return {
      title: 'Customer Story Not Published',
      description:
        'This customer story URL is not published. Use current workflow proof, pricing, and trust pages instead.',
      robots: {
        index: false,
        follow: false,
      },
      alternates: {
        canonical: `${BASE_URL}/customers`,
      },
    }
  }

  return {
    title: `${story.chefName} Case Study`,
    description: story.summary,
    openGraph: {
      title: `${story.chefName} Case Study`,
      description: story.summary,
      url: `${BASE_URL}/customers/${story.slug}`,
      siteName: 'ChefFlow',
      type: 'article',
    },
    alternates: {
      canonical: `${BASE_URL}/customers/${story.slug}`,
    },
  }
}

export default function CustomerStoryPage({ params }: Props) {
  const story = getCustomerStory(params.slug)
  const isBeta = LAUNCH_MODE === 'beta'

  if (!story) {
    return (
      <main>
        <PublicPageView
          pageName="customer_story_unavailable"
          properties={{ section: 'public_growth', story_slug: params.slug }}
        />

        <section className="relative overflow-hidden border-b border-stone-700/50">
          <div className="pointer-events-none absolute left-1/2 top-0 h-[340px] w-[680px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[80px]" />
          <div className="relative mx-auto w-full max-w-4xl px-4 py-16 text-center sm:px-6 md:py-24 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
              Customer Stories
            </p>
            <h1 className="mt-3 text-4xl font-display tracking-[-0.04em] text-stone-100 md:text-5xl">
              This customer story is not published.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-stone-300">
              ChefFlow only publishes approved customer stories. This URL does not point to a live
              story yet, so the honest next step is to use the current proof paths below.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6">
              <h2 className="text-xl font-semibold text-stone-100">Workflow proof</h2>
              <p className="mt-3 text-sm leading-7 text-stone-300">
                Review the operator page for real screens and the current demo video.
              </p>
              <TrackedLink
                href="/for-operators"
                analyticsName="customer_story_unavailable_proof"
                analyticsProps={{ story_slug: params.slug }}
                className="mt-5 inline-flex items-center rounded-lg border border-stone-600 bg-stone-900 px-5 py-2.5 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
              >
                See operator proof
              </TrackedLink>
            </article>

            <article className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6">
              <h2 className="text-xl font-semibold text-stone-100">Current product state</h2>
              <p className="mt-3 text-sm leading-7 text-stone-300">
                Use pricing for the exact free versus voluntary support versus future paid state
                instead of relying on story-shaped marketing copy.
              </p>
              <TrackedLink
                href="/pricing"
                analyticsName="customer_story_unavailable_pricing"
                analyticsProps={{ story_slug: params.slug }}
                className="mt-5 inline-flex items-center rounded-lg border border-stone-600 bg-stone-900 px-5 py-2.5 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
              >
                View pricing
              </TrackedLink>
            </article>

            <article className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6">
              <h2 className="text-xl font-semibold text-stone-100">Customer stories index</h2>
              <p className="mt-3 text-sm leading-7 text-stone-300">
                Check the main customer stories page for the current approval status.
              </p>
              <TrackedLink
                href="/customers"
                analyticsName="customer_story_unavailable_index"
                analyticsProps={{ story_slug: params.slug }}
                className="mt-5 inline-flex items-center rounded-lg border border-stone-600 bg-stone-900 px-5 py-2.5 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
              >
                Back to customer stories
              </TrackedLink>
            </article>
          </div>
        </section>

        <section className="border-y border-stone-700/50 bg-stone-900/40">
          <div className="mx-auto w-full max-w-4xl px-4 py-14 text-center sm:px-6 md:py-20 lg:px-8">
            <h2 className="text-3xl font-display tracking-[-0.04em] text-stone-100 md:text-4xl">
              Build your own baseline next.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-stone-300">
              {isBeta
                ? 'Join the beta waitlist if you want direct feedback loops while public stories are still pending approval.'
                : 'Start free and evaluate the workflow directly while the public story library is still empty.'}
            </p>
            <TrackedLink
              href={buildMarketingSignupHref({
                sourcePage: `customer_story_unavailable_${params.slug}`,
                sourceCta: 'bottom_primary',
              })}
              analyticsName="customer_story_unavailable_primary_cta"
              analyticsProps={{ story_slug: params.slug }}
              className="mt-8 inline-flex items-center rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              {PRIMARY_SIGNUP_LABEL}
            </TrackedLink>
          </div>
        </section>
      </main>
    )
  }

  const storyStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: story.title,
    description: story.summary,
    url: `${BASE_URL}/customers/${story.slug}`,
    mainEntityOfPage: `${BASE_URL}/customers/${story.slug}`,
    author: {
      '@type': 'Person',
      name: story.chefName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'ChefFlow',
      url: BASE_URL,
    },
  }

  return (
    <article>
      <PublicPageView
        pageName="customer_story"
        properties={{ section: 'public_growth', story_slug: story.slug }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storyStructuredData) }}
      />
      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[340px] w-[680px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[80px]" />
        <div className="relative mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
            {story.timeline}
          </p>
          <h1 className="mt-3 text-4xl font-display tracking-[-0.04em] text-stone-100 md:text-5xl">
            {story.title}
          </h1>
          <p className="mt-4 text-sm text-stone-400">
            {story.chefName} - {story.chefProfile} - {story.location}
          </p>
          <p className="mt-5 text-base leading-relaxed text-stone-300">{story.summary}</p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr,0.8fr] lg:px-8">
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-stone-100">Challenge</h2>
            <ul className="mt-4 space-y-2">
              {story.challenge.map((item) => (
                <li key={item} className="text-sm leading-relaxed text-stone-300">
                  - {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-stone-100">What Changed</h2>
            <ul className="mt-4 space-y-2">
              {story.solution.map((item) => (
                <li key={item} className="text-sm leading-relaxed text-stone-300">
                  - {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-stone-100">Outcomes</h2>
            <ul className="mt-4 space-y-2">
              {story.outcomes.map((item) => (
                <li key={item} className="text-sm leading-relaxed text-stone-300">
                  - {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-stone-700 bg-stone-900/80 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-300">
              Key Metrics
            </h3>
            <div className="mt-4 space-y-3">
              {story.metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-3"
                >
                  <p className="text-xs text-stone-400">{metric.label}</p>
                  <p className="mt-1 text-sm text-stone-300">
                    {metric.before} {'->'} {metric.after}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-brand-300">{metric.delta}</p>
                </div>
              ))}
            </div>
          </div>

          <blockquote className="rounded-2xl border border-stone-700 bg-stone-900/80 p-5">
            <p className="text-sm italic leading-relaxed text-stone-200">"{story.quote}"</p>
            <footer className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-brand-300">
              {story.quoteAttribution}
            </footer>
          </blockquote>
        </aside>
      </section>

      <section className="border-y border-stone-700/50 bg-stone-900/40">
        <div className="mx-auto w-full max-w-4xl px-4 py-14 text-center sm:px-6 md:py-20 lg:px-8">
          <h2 className="text-3xl font-display tracking-[-0.04em] text-stone-100 md:text-4xl">
            Build your own baseline next.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-stone-300">
            {isBeta
              ? 'Join the beta waitlist and help prioritize the next operating workflows.'
              : 'Sign up free and run the same inquiry-to-payout discipline in your business.'}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedLink
              href={buildMarketingSignupHref({
                sourcePage: `customer_story_${story.slug}`,
                sourceCta: 'bottom_primary',
              })}
              analyticsName="customer_story_primary_cta"
              analyticsProps={{ story_slug: story.slug }}
              className="inline-flex items-center rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              {PRIMARY_SIGNUP_LABEL}
            </TrackedLink>
            <TrackedLink
              href="/customers"
              analyticsName="customer_story_back_to_index"
              analyticsProps={{ story_slug: story.slug }}
              className="inline-flex items-center rounded-lg border border-stone-600 bg-stone-900 px-7 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
            >
              More stories
            </TrackedLink>
          </div>
        </div>
      </section>
    </article>
  )
}
