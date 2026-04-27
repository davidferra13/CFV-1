import type { Metadata } from 'next'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { LAUNCH_MODE, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'
import { buildMarketingSignupHref } from '@/lib/marketing/signup-links'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

const PUBLICATION_RULES = [
  'Only approved customer stories will be published here.',
  'Every published quote, metric, logo, or attribution will require explicit customer approval.',
  'No generated names, fabricated outcomes, or synthetic testimonials will be used as filler.',
] as const

const AVAILABLE_PROOF_PATHS = [
  {
    title: 'Workflow proof',
    detail:
      'Use the operator page for real screenshots and the real demo video of intake, event, and finance states.',
    href: '/for-operators',
    analyticsName: 'customers_proof_workflow',
    cta: 'See operator proof',
  },
  {
    title: 'Current product state',
    detail:
      'Use the pricing page for the exact free versus voluntary support versus future paid state instead of relying on older marketing copy.',
    href: '/pricing',
    analyticsName: 'customers_proof_pricing',
    cta: 'View pricing',
  },
  {
    title: 'Trust and rollout',
    detail:
      'Use the Trust Center for founder-visible support posture, public standards, and rollout framing.',
    href: '/trust',
    analyticsName: 'customers_proof_trust',
    cta: 'Review trust center',
  },
] as const

export const metadata: Metadata = {
  title: 'Customer Stories',
  description:
    'No approved customer stories are published yet. Use workflow proof, pricing, and trust pages until customer approvals exist.',
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'ChefFlow Customer Stories',
    description:
      'No approved customer stories are published yet. Use workflow proof, pricing, and trust pages until customer approvals exist.',
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
    description:
      'No approved customer stories are published yet. This page routes visitors to current proof sources.',
    url: `${BASE_URL}/customers`,
  }

  return (
    <div>
      <PublicPageView pageName="customers" properties={{ section: 'public_growth' }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(customersStructuredData) }}
      />

      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[380px] w-[720px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[80px]" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6 md:py-24 lg:px-8">
          <p className="inline-flex rounded-full border border-brand-700 bg-stone-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            Customer Stories
          </p>
          <h1 className="mt-5 text-4xl font-display tracking-[-0.04em] text-stone-100 md:text-6xl">
            No customer stories are published yet.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-stone-300 md:text-lg">
            ChefFlow removed sample testimonials and does not backfill this page with invented
            outcomes. Until customers approve public stories, this page stays honest about the gap
            and routes you to the proof that is available now.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6 md:p-8">
          <h2 className="text-2xl font-display tracking-[-0.04em] text-stone-100 md:text-3xl">
            Publication standard
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-stone-300">
            {PUBLICATION_RULES.map((rule) => (
              <li key={rule} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-400" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-y border-stone-700/50 bg-stone-900/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-display tracking-[-0.04em] text-stone-100 md:text-4xl">
              What you can review right now
            </h2>
            <p className="mt-4 text-base leading-relaxed text-stone-300">
              If you are evaluating ChefFlow today, these are the honest proof routes to use until
              approved customer stories exist.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {AVAILABLE_PROOF_PATHS.map((path) => (
              <article
                key={path.title}
                className="rounded-2xl border border-stone-700 bg-stone-950/70 p-6"
              >
                <h3 className="text-xl font-semibold text-stone-100">{path.title}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-300">{path.detail}</p>
                <TrackedLink
                  href={path.href}
                  analyticsName={path.analyticsName}
                  analyticsProps={{ section: 'available_proof' }}
                  className="mt-5 inline-flex items-center rounded-lg border border-stone-600 bg-stone-900 px-5 py-2.5 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
                >
                  {path.cta}
                </TrackedLink>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-14 text-center sm:px-6 md:py-20 lg:px-8">
        <h2 className="text-3xl font-display tracking-[-0.04em] text-stone-100 md:text-4xl">
          Build your own baseline while the story library is empty.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-300">
          {isBeta
            ? 'Join the closed beta if you want a direct feedback loop while the public proof library is still being built.'
            : 'Start free, run one live workflow, and use the operator proof page as the current public baseline.'}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <TrackedLink
            href="/for-operators"
            analyticsName="customers_bottom_proof_cta"
            analyticsProps={{ section: 'customers_bottom' }}
            className="inline-flex items-center rounded-lg border border-stone-600 bg-stone-900 px-7 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
          >
            Review workflow proof
          </TrackedLink>
          <TrackedLink
            href={buildMarketingSignupHref({
              sourcePage: 'customers',
              sourceCta: 'bottom_primary',
            })}
            analyticsName="customers_bottom_primary_cta"
            analyticsProps={{ launch_mode: LAUNCH_MODE, section: 'customers_bottom' }}
            className="inline-flex items-center rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {PRIMARY_SIGNUP_LABEL}
          </TrackedLink>
        </div>
      </section>
    </div>
  )
}
