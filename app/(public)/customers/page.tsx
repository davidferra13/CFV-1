import type { Metadata } from 'next'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { LAUNCH_MODE, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'
import { buildMarketingSignupHref } from '@/lib/marketing/signup-links'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Customer Stories | ChefFlow',
  description:
    'Customer stories are not yet published. ChefFlow only publishes verified and approved customer testimonials.',
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'ChefFlow Customer Stories',
    description:
      'Customer stories are not yet published. ChefFlow only publishes verified and approved customer testimonials.',
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
          <h1 className="mt-5 text-4xl font-display tracking-tight text-stone-100 md:text-6xl">
            We have not published customer stories yet.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-stone-300 md:text-lg">
            We removed sample testimonials and do not display fabricated outcomes. This page will
            only show verified, approved customer stories when they are available.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6 md:p-8">
          <h2 className="text-2xl font-display tracking-tight text-stone-100 md:text-3xl">
            What to expect
          </h2>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-stone-300">
            <li>- Only real customer stories will be published here.</li>
            <li>- Every published quote or metric will require explicit customer approval.</li>
            <li>- No generated names, fabricated outcomes, or synthetic testimonials.</li>
          </ul>
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
              : 'Sign up free and implement one consistent workflow from inquiry to payout.'}
          </p>
          <TrackedLink
            href={buildMarketingSignupHref({
              sourcePage: 'customers',
              sourceCta: 'bottom_primary',
            })}
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
