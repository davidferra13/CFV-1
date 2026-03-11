import type { Metadata } from 'next'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { LAUNCH_MODE, PRIMARY_SIGNUP_HREF, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

const TRUST_SECTIONS = [
  {
    title: 'Security Baseline',
    points: [
      'Encrypted transport (TLS) for data in transit.',
      'Hashed credentials and scoped access controls.',
      'Row-level data isolation to prevent cross-tenant leaks.',
      'Server-side auth checks on privileged workflows.',
    ],
  },
  {
    title: 'Data Handling',
    points: [
      'Payments are processed through Stripe; full card data is not stored on ChefFlow servers.',
      'Operational data access is limited to authorized workflows and roles.',
      'Privacy and processing expectations are documented in public policy pages.',
      'Security concerns can be reported at security@cheflowhq.com.',
    ],
  },
  {
    title: 'Directory Standards',
    points: [
      'Public directory visibility is controlled and approval-gated.',
      'Profiles can expose reviews only when chefs explicitly share them.',
      'Booking and inquiry flows are standardized to reduce ambiguity.',
      'Partner and venue visibility is controlled per chef profile.',
    ],
  },
  {
    title: 'Operational Support',
    points: [
      'Support channel: support@cheflowhq.com.',
      'Typical support response target: one business day.',
      'Critical issues are triaged first with user impact as the priority.',
      'Public legal and privacy pages are versioned and updateable.',
    ],
  },
]

export const metadata: Metadata = {
  title: 'Trust Center | ChefFlow',
  description:
    'Security baseline, data handling practices, directory standards, and support commitments for ChefFlow.',
  openGraph: {
    title: 'ChefFlow Trust Center',
    description:
      'Review security, privacy, and operational trust details before adopting ChefFlow.',
    url: `${BASE_URL}/trust`,
    siteName: 'ChefFlow',
    type: 'website',
  },
  alternates: {
    canonical: `${BASE_URL}/trust`,
  },
}

export default function TrustPage() {
  const isBeta = LAUNCH_MODE === 'beta'
  const trustStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'ChefFlow Trust Center',
    description:
      'Security baseline, data handling practices, directory standards, and support commitments for ChefFlow.',
    url: `${BASE_URL}/trust`,
    publisher: {
      '@type': 'Organization',
      name: 'ChefFlow',
      url: BASE_URL,
    },
  }

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(trustStructuredData) }}
      />
      <section className="relative overflow-hidden border-b border-stone-200 dark:border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[700px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[80px] hidden dark:block" />
        <div className="relative mx-auto w-full max-w-5xl px-4 py-16 text-center sm:px-6 md:py-24 lg:px-8">
          <p className="inline-flex rounded-full border border-brand-200 dark:border-brand-700 bg-white dark:bg-stone-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-700 dark:text-brand-300">
            Trust Center
          </p>
          <h1 className="mt-5 fluid-display-xl font-display tracking-tight text-stone-900 dark:text-stone-100">
            Security and reliability expectations, clearly stated.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-stone-600 dark:text-stone-300 md:text-lg">
            This page is the practical baseline: what is protected, how data is handled, and where
            to escalate issues.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        {TRUST_SECTIONS.map((section) => (
          <article
            key={section.title}
            className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white/80 dark:bg-stone-900/80 p-6 shadow-[var(--shadow-card)]"
          >
            <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
              {section.title}
            </h2>
            <ul className="mt-4 space-y-2">
              {section.points.map((point) => (
                <li
                  key={point}
                  className="text-sm leading-relaxed text-stone-600 dark:text-stone-300"
                >
                  - {point}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white/80 dark:bg-stone-900/80 p-6">
          <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
            Policy References
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <TrackedLink
              href="/privacy"
              analyticsName="trust_privacy_link"
              className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-semibold text-stone-900 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              Privacy Policy
            </TrackedLink>
            <TrackedLink
              href="/terms"
              analyticsName="trust_terms_link"
              className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-semibold text-stone-900 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              Terms of Service
            </TrackedLink>
            <a
              href="mailto:security@cheflowhq.com"
              className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-semibold text-stone-900 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              security@cheflowhq.com
            </a>
            <a
              href="mailto:support@cheflowhq.com"
              className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-semibold text-stone-900 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              support@cheflowhq.com
            </a>
          </div>
        </div>
      </section>

      <section className="border-y border-stone-200 dark:border-stone-700/50 bg-stone-50/40 dark:bg-stone-900/40">
        <div className="mx-auto w-full max-w-5xl px-4 py-14 text-center sm:px-6 md:py-20 lg:px-8">
          <h2 className="fluid-display-lg font-display tracking-tight text-stone-900 dark:text-stone-100">
            Want to test these workflows in your own operation?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-600 dark:text-stone-300">
            {isBeta
              ? 'Join the beta waitlist and work directly with product during onboarding.'
              : 'Start a trial and validate inquiry, event, and payout workflows end-to-end.'}
          </p>
          <TrackedLink
            href={PRIMARY_SIGNUP_HREF}
            analyticsName="trust_primary_cta"
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
