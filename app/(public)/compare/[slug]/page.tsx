import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { BreadcrumbJsonLd, FAQPageJsonLd, JsonLd } from '@/components/seo/json-ld'
import { COMPARE_PAGES, getComparePage } from '@/lib/marketing/compare-pages'
import { LAUNCH_MODE, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'
import { buildMarketingSignupHref } from '@/lib/marketing/signup-links'
import { buildOperatorWalkthroughHref } from '@/lib/marketing/walkthrough-links'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
const COMPARE_DETAIL_OG_IMAGE = `${BASE_URL}/compare/opengraph-image`

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

  const pageUrl = `${BASE_URL}/compare/${page.slug}`
  const socialImageUrl = COMPARE_DETAIL_OG_IMAGE
  const metaDescription = `${page.summary} Review fit, migration steps, and the next evaluation path for private chef teams.`

  return {
    title: page.title,
    description: metaDescription,
    openGraph: {
      title: page.title,
      description: metaDescription,
      url: pageUrl,
      siteName: 'ChefFlow',
      type: 'website',
      images: [
        {
          url: socialImageUrl,
          width: 1200,
          height: 630,
          alt: `${page.title} preview`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: metaDescription,
      images: [socialImageUrl],
    },
    alternates: {
      canonical: pageUrl,
    },
  }
}

export default function CompareDetailPage({ params }: Props) {
  const page = getComparePage(params.slug)
  if (!page) notFound()

  const isBeta = LAUNCH_MODE === 'beta'
  const pageUrl = `${BASE_URL}/compare/${page.slug}`
  const compareStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.summary,
    url: pageUrl,
    isPartOf: {
      '@type': 'CollectionPage',
      name: 'ChefFlow Comparison Hub',
      url: `${BASE_URL}/compare`,
    },
    about: [
      {
        '@type': 'SoftwareApplication',
        name: 'ChefFlow',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
      },
      {
        '@type': 'SoftwareApplication',
        name: page.alternativeName,
        applicationCategory: 'BusinessApplication',
      },
    ],
    mainEntity: {
      '@type': 'ItemList',
      itemListOrder: 'https://schema.org/ItemListUnordered',
      numberOfItems: page.rows.length,
      itemListElement: page.rows.map((row, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: row.capability,
        description: `ChefFlow: ${row.chefflow} ${page.alternativeName}: ${row.alternative}`,
      })),
    },
    publisher: {
      '@type': 'Organization',
      name: 'ChefFlow',
      url: BASE_URL,
    },
  }
  const evaluationChecklist = [
    `Check whether ${page.alternativeName} already covers your live event handoffs or only the sales and admin side.`,
    'Move active work first instead of rebuilding historical records on day one.',
    'Measure response time, handoff quality, and margin visibility before cutting over fully.',
  ]
  const rolloutGuardrails = [
    'Migrate live inquiries, open quotes, and upcoming events first.',
    `Keep ${page.alternativeName} or your current stack read-only until one clean billing cycle closes.`,
    'Lock stage ownership early so the team is not updating two systems with different rules.',
  ]

  return (
    <article>
      <PublicPageView
        pageName="compare_detail"
        properties={{ section: 'public_growth', compare_slug: page.slug }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: BASE_URL },
          { name: 'Compare', url: `${BASE_URL}/compare` },
          { name: page.alternativeName, url: pageUrl },
        ]}
      />
      <JsonLd data={compareStructuredData} />
      <FAQPageJsonLd faqs={page.faqs} />

      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[700px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[80px]" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <div>
              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-2 text-xs text-stone-500"
              >
                <Link href="/" className="transition-colors hover:text-stone-300">
                  Home
                </Link>
                <span>/</span>
                <Link href="/compare" className="transition-colors hover:text-stone-300">
                  Compare
                </Link>
                <span>/</span>
                <span className="text-stone-400">{page.alternativeName}</span>
              </nav>

              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
                Comparison Guide
              </p>
              <h1 className="mt-3 max-w-4xl text-4xl font-display tracking-tight text-stone-100 md:text-5xl">
                {page.title}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-stone-300 md:text-lg">
                {page.heroDescription}
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-400">
                Use this page to judge workflow fit, migration effort, and the right next step
                before changing systems.
              </p>
            </div>

            <aside className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6 shadow-[var(--shadow-card)]">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                Evaluation Path
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-stone-100">
                Need proof beyond the table?
              </h2>
              <p className="mt-3 text-sm leading-7 text-stone-300">
                Use the workflow proof and walkthrough paths if you need to pressure-test this
                switch against your live process before migrating.
              </p>
              <ul className="mt-4 space-y-2">
                {evaluationChecklist.map((item) => (
                  <li key={item} className="text-sm text-stone-300">
                    - {item}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-col gap-3">
                <TrackedLink
                  href={buildOperatorWalkthroughHref({
                    sourcePage: `compare_${page.slug}`,
                    sourceCta: 'hero_walkthrough',
                  })}
                  analyticsName="compare_detail_walkthrough_cta"
                  analyticsProps={{ compare_slug: page.slug, section: 'hero_aside' }}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Request operator walkthrough
                </TrackedLink>
                <TrackedLink
                  href="/for-operators"
                  analyticsName="compare_detail_proof_cta"
                  analyticsProps={{ compare_slug: page.slug, section: 'hero_aside' }}
                  className="inline-flex items-center justify-center rounded-lg border border-stone-600 bg-stone-900 px-5 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
                >
                  See workflow proof
                </TrackedLink>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            Best Fit
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-100">Choose ChefFlow when</h2>
          <p className="mt-3 text-sm leading-7 text-stone-400">
            The operation needs execution visibility, not just generic sales or admin coverage.
          </p>
          <ul className="mt-4 space-y-2">
            {page.idealFor.map((item) => (
              <li key={item} className="text-sm leading-relaxed text-stone-300">
                - {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            Not A Fit
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-100">
            Stay with {page.alternativeName} if
          </h2>
          <p className="mt-3 text-sm leading-7 text-stone-400">
            The generalized stack is still aligned to how your team actually operates today.
          </p>
          <ul className="mt-4 space-y-2">
            {page.notIdealFor.map((item) => (
              <li key={item} className="text-sm leading-relaxed text-stone-300">
                - {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            Validate First
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-100">
            Pressure-test these differences
          </h2>
          <p className="mt-3 text-sm leading-7 text-stone-400">
            Before switching, compare the capabilities most likely to change how your team works.
          </p>
          <ul className="mt-4 space-y-2">
            {page.rows.slice(0, 3).map((row) => (
              <li key={row.capability} className="text-sm leading-relaxed text-stone-300">
                - {row.capability}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-6 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            Workflow Tradeoffs
          </p>
          <h2 className="mt-3 text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
            Where the workflow actually changes
          </h2>
          <p className="mt-4 text-sm leading-7 text-stone-400">
            This table stays narrow on purpose: fit, handoff continuity, and migration overhead.
            It does not invent performance proof that is not published.
          </p>
        </div>
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
              Migration Guidance
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-stone-100">Migration playbook</h2>
            <p className="mt-3 text-sm leading-7 text-stone-400">
              Keep the rollout controlled. Move the live workflow first, validate the handoffs, then
              retire duplicate tracking once the new baseline is stable.
            </p>
            <ol className="mt-6 grid gap-3 md:grid-cols-2">
              {page.migrationSteps.map((step, index) => (
                <li
                  key={step}
                  className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-4 text-sm text-stone-300"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                    Step {index + 1}
                  </p>
                  <p className="mt-2 leading-7">{step}</p>
                </li>
              ))}
            </ol>
          </div>

          <aside className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
              Rollout Guardrails
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-stone-100">Keep the pilot clean</h2>
            <ul className="mt-4 space-y-2">
              {rolloutGuardrails.map((item) => (
                <li key={item} className="text-sm leading-relaxed text-stone-300">
                  - {item}
                </li>
              ))}
            </ul>
            <TrackedLink
              href={buildMarketingSignupHref({
                sourcePage: `compare_${page.slug}`,
                sourceCta: 'migration_guardrail',
              })}
              analyticsName="compare_detail_guardrail_signup"
              analyticsProps={{ compare_slug: page.slug, section: 'migration_guardrails' }}
              className="mt-6 inline-flex items-center rounded-lg border border-stone-600 bg-stone-900 px-5 py-2.5 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
            >
              {isBeta ? 'Join beta waitlist' : PRIMARY_SIGNUP_LABEL}
            </TrackedLink>
          </aside>
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
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
              Ready to evaluate this on your actual workflow?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-stone-300">
              Choose the next step that matches how much proof you still need before moving.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-stone-700 bg-stone-950/70 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                Walkthrough
              </p>
              <h3 className="mt-3 text-xl font-semibold text-stone-100">Map the switch live</h3>
              <p className="mt-3 text-sm leading-7 text-stone-300">
                Use the walkthrough path if you want help pressure-testing stages, handoffs, or
                migration scope against your current setup.
              </p>
              <TrackedLink
                href={buildOperatorWalkthroughHref({
                  sourcePage: `compare_${page.slug}`,
                  sourceCta: 'bottom_walkthrough',
                })}
                analyticsName="compare_detail_bottom_walkthrough"
                analyticsProps={{ compare_slug: page.slug, section: 'final_cta' }}
                className="mt-5 inline-flex items-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Request operator walkthrough
              </TrackedLink>
            </article>

            <article className="rounded-2xl border border-stone-700 bg-stone-950/70 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                Proof
              </p>
              <h3 className="mt-3 text-xl font-semibold text-stone-100">Review the workflow</h3>
              <p className="mt-3 text-sm leading-7 text-stone-300">
                Use the operator page when you want real screens and workflow proof before you book
                time or start a pilot.
              </p>
              <TrackedLink
                href="/for-operators"
                analyticsName="compare_detail_bottom_proof"
                analyticsProps={{ compare_slug: page.slug, section: 'final_cta' }}
                className="mt-5 inline-flex items-center rounded-lg border border-stone-600 bg-stone-900 px-5 py-2.5 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
              >
                See workflow proof
              </TrackedLink>
            </article>

            <article className="rounded-2xl border border-stone-700 bg-stone-950/70 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                Pilot
              </p>
              <h3 className="mt-3 text-xl font-semibold text-stone-100">
                Start with one live pipeline
              </h3>
              <p className="mt-3 text-sm leading-7 text-stone-300">
                If the fit already looks right, start small and measure response time, handoff
                quality, and margin clarity over the next 30 days.
              </p>
              <TrackedLink
                href={buildMarketingSignupHref({
                  sourcePage: `compare_${page.slug}`,
                  sourceCta: 'bottom_primary',
                })}
                analyticsName="compare_detail_primary_cta"
                analyticsProps={{ launch_mode: LAUNCH_MODE, compare_slug: page.slug }}
                className="mt-5 inline-flex items-center rounded-lg border border-stone-600 bg-stone-900 px-5 py-2.5 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
              >
                {isBeta ? 'Join beta waitlist' : PRIMARY_SIGNUP_LABEL}
              </TrackedLink>
            </article>
          </div>

          <div className="mt-6">
            <TrackedLink
              href="/compare"
              analyticsName="compare_detail_back_index"
              analyticsProps={{ compare_slug: page.slug }}
              className="inline-flex items-center text-sm font-semibold text-brand-300 transition-colors hover:text-brand-200"
            >
              View more comparison guides
            </TrackedLink>
          </div>
        </div>
      </section>
    </article>
  )
}
