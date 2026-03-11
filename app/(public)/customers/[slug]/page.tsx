import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { CUSTOMER_STORIES, getCustomerStory } from '@/lib/marketing/customer-stories'
import { LAUNCH_MODE, PRIMARY_SIGNUP_HREF, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'

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
  if (!story) return { title: 'Story Not Found' }

  return {
    title: `${story.chefName} Case Study | ChefFlow`,
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
  if (!story) notFound()

  const isBeta = LAUNCH_MODE === 'beta'
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
    <article className="dark-surface bg-stone-950">
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
          <h1 className="mt-3 text-4xl font-display tracking-tight text-stone-100 md:text-5xl">
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
          <h2 className="text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
            Build your own baseline next.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-stone-300">
            {isBeta
              ? 'Join the beta waitlist and help prioritize the next operating workflows.'
              : 'Start your trial and run the same inquiry-to-payout discipline in your business.'}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedLink
              href={PRIMARY_SIGNUP_HREF}
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
