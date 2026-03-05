import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { COMPARE_PAGES, getComparePage } from '@/lib/marketing/compare-pages'
import { LAUNCH_MODE, PRIMARY_SIGNUP_HREF, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

type Props = {
  params: {
    slug: string
  }
}

export function generateStaticParams() {
  return COMPARE_PAGES.map((page) => ({ slug: page.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getComparePage(params.slug)
  if (!page) return { title: 'Comparison Not Found' }

  return {
    title: page.title,
    description: page.summary,
    openGraph: {
      title: page.title,
      description: page.summary,
      url: `${BASE_URL}/compare/${page.slug}`,
      siteName: 'ChefFlow',
      type: 'article',
    },
    alternates: {
      canonical: `${BASE_URL}/compare/${page.slug}`,
    },
  }
}

export default function CompareDetailPage({ params }: Props) {
  const page = getComparePage(params.slug)
  if (!page) notFound()

  const isBeta = LAUNCH_MODE === 'beta'
  const compareStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title,
    description: page.summary,
    url: `${BASE_URL}/compare/${page.slug}`,
    publisher: {
      '@type': 'Organization',
      name: 'ChefFlow',
      url: BASE_URL,
    },
    mainEntity: page.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(compareStructuredData) }}
      />

      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[700px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[80px]" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
            Comparison Guide
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-display tracking-tight text-stone-100 md:text-5xl">
            {page.title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-stone-300 md:text-lg">
            {page.heroDescription}
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6">
          <h2 className="text-2xl font-semibold text-stone-100">Best fit when you need</h2>
          <ul className="mt-4 space-y-2">
            {page.idealFor.map((item) => (
              <li key={item} className="text-sm leading-relaxed text-stone-300">
                - {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6">
          <h2 className="text-2xl font-semibold text-stone-100">Probably not ideal if</h2>
          <ul className="mt-4 space-y-2">
            {page.notIdealFor.map((item) => (
              <li key={item} className="text-sm leading-relaxed text-stone-300">
                - {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="overflow-x-auto rounded-2xl border border-stone-700 bg-stone-900/80">
          <table className="min-w-[820px] w-full border-collapse">
            <thead>
              <tr className="border-b border-stone-700 bg-stone-900">
                <th className="px-5 py-4 text-left text-sm font-semibold text-stone-100">
                  Capability
                </th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-stone-100">
                  ChefFlow
                </th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-stone-100">
                  {page.alternativeName}
                </th>
              </tr>
            </thead>
            <tbody>
              {page.rows.map((row) => (
                <tr key={row.capability} className="border-b border-stone-800 align-top">
                  <td className="px-5 py-4 text-sm font-medium text-stone-100">{row.capability}</td>
                  <td className="px-5 py-4 text-sm text-stone-300">{row.chefflow}</td>
                  <td className="px-5 py-4 text-sm text-stone-300">{row.alternative}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6 md:p-8">
          <h2 className="text-2xl font-semibold text-stone-100">Migration playbook</h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {page.migrationSteps.map((step) => (
              <li
                key={step}
                className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-stone-300"
              >
                {step}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 pb-12 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-display text-stone-100 md:text-3xl">
          Common questions
        </h2>
        <div className="mt-6 space-y-3">
          {page.faqs.map((faq) => (
            <details
              key={faq.question}
              className="rounded-xl border border-stone-700 bg-stone-900/80 p-4"
            >
              <summary className="cursor-pointer list-none pr-4 text-sm font-semibold text-stone-100">
                {faq.question}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-stone-300">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="border-y border-stone-700/50 bg-stone-900/40">
        <div className="mx-auto w-full max-w-5xl px-4 py-14 text-center sm:px-6 md:py-20 lg:px-8">
          <h2 className="text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
            Want to test this against your real workflow?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-300">
            Start with one pipeline and measure response time, handoff quality, and event margin
            clarity over the next 30 days.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedLink
              href={PRIMARY_SIGNUP_HREF}
              analyticsName="compare_detail_primary_cta"
              analyticsProps={{ launch_mode: LAUNCH_MODE, compare_slug: page.slug }}
              className="inline-flex items-center rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              {isBeta ? 'Join beta waitlist' : PRIMARY_SIGNUP_LABEL}
            </TrackedLink>
            <TrackedLink
              href="/compare"
              analyticsName="compare_detail_back_index"
              analyticsProps={{ compare_slug: page.slug }}
              className="inline-flex items-center rounded-lg border border-stone-600 bg-stone-900 px-7 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
            >
              More comparisons
            </TrackedLink>
          </div>
        </div>
      </section>
    </article>
  )
}
