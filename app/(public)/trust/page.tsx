import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { LAUNCH_MODE, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'
import { buildMarketingSignupHref } from '@/lib/marketing/signup-links'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

const VERIFY_POINTS = [
  'Public chef listings are tied to a real ChefFlow account before they appear in the directory.',
  'Directory approval checks profile completeness, service details, and contact-path accuracy.',
  'If a profile shows an insurance or certification badge, ChefFlow has an active uploaded record on file for that chef.',
  'If payment is taken through a ChefFlow checkout flow, the payment record runs through Stripe and can be referenced by support.',
]

const DO_NOT_VERIFY_POINTS = [
  'ChefFlow does not run a universal background check on every chef.',
  'ChefFlow does not guarantee that every chef meets every local licensing or permit requirement in every jurisdiction.',
  'ChefFlow does not guarantee event quality, food safety outcomes, or chef-client fit.',
  'ChefFlow does not offer a marketplace-wide replacement guarantee, automatic refund promise, or universal no-show insurance.',
]

const BADGE_EVIDENCE_CARDS = [
  {
    title: 'Current record badge',
    body: 'A public insurance, certification, or business-record badge means ChefFlow has an active uploaded record on file and the visible effective/expiry window has not lapsed.',
  },
  {
    title: 'Self-reported profile detail',
    body: 'Service statements such as travel policies, dietary handling, cleanup, or carrying insurance can come from chef-published settings. Those details help buyers plan, but they are not the same as a current-record badge.',
  },
  {
    title: 'Why a badge may disappear',
    body: 'If a record expires, is removed, or is no longer active, the public badge can disappear even if the chef still mentions that topic elsewhere on the profile.',
  },
]

const PROCESS_CARDS = [
  {
    title: 'Payment protection',
    body: 'If payment is processed through ChefFlow, checkout runs on Stripe. ChefFlow does not store full card numbers, and there is a payment record tied to the booking.',
  },
  {
    title: 'Cancellations and refunds',
    body: 'Deposit, cancellation, and refund terms come from the chef agreement, quote, or booking terms. Review those written terms before paying. ChefFlow does not impose one universal refund policy across all chefs.',
  },
  {
    title: 'Disputes',
    body: 'If a payment was processed through ChefFlow, support can review the payment record and booking timeline. That does not guarantee a refund. Card disputes may still need to follow Stripe or bank processes.',
  },
  {
    title: 'Chef no-show or day-of issue',
    body: 'Contact the chef immediately, then email support@cheflowhq.com with the event date, chef name, and payment reference if one exists. ChefFlow can review the record and escalate internally, but does not promise emergency replacement coverage today.',
  },
]

const ESCALATION_STEPS = [
  'Use the written chef contact path first for timing, menu, and scope questions.',
  'If the issue involves payment, cancellation, or a serious service problem, email support@cheflowhq.com with the event date and any payment receipt.',
  'For security concerns, email security@cheflowhq.com.',
]

const SUPPORT_CAN_HELP = [
  'Review ChefFlow payment records, booking timestamps, and account-linked communications that exist inside the product.',
  'Clarify which booking path was used and where the written terms or payment trail should live.',
  'Escalate serious service, payment, or security issues internally for review.',
]

const SUPPORT_CANNOT_HELP = [
  'Guarantee refunds, replacement chefs, or a specific dispute outcome.',
  'Override a chef-client written agreement that was made outside ChefFlow.',
  'Certify that a chef is compliant with every local law, permit, or licensing rule everywhere they operate.',
]

export const metadata: Metadata = {
  title: 'Trust Center',
  description:
    'Plain-English trust expectations for ChefFlow: what we verify, what we do not verify, how payment records work, and how support escalation works.',
  openGraph: {
    title: 'ChefFlow Trust Center',
    description:
      'Read what ChefFlow verifies, what it does not verify, and how payment, cancellation, dispute, and support expectations work.',
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
      'Plain-English trust expectations for ChefFlow: what we verify, what we do not verify, how payment records work, and how support escalation works.',
    url: `${BASE_URL}/trust`,
    publisher: {
      '@type': 'Organization',
      name: 'ChefFlow',
      url: BASE_URL,
    },
  }

  return (
    <div>
      <PublicPageView pageName="trust" properties={{ section: 'public_growth' }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(trustStructuredData) }}
      />

      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[700px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[80px]" />
        <div className="relative mx-auto w-full max-w-5xl px-4 py-16 text-center sm:px-6 md:py-24 lg:px-8">
          <p className="inline-flex rounded-full border border-brand-700 bg-stone-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            Trust Center
          </p>
          <h1 className="mt-5 fluid-display-xl font-display tracking-tight text-stone-100">
            Trust is clearer when the limits are explicit.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-stone-300 md:text-lg">
            This page explains what ChefFlow verifies, what it does not verify, how payment records
            work, and where support escalation starts.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <TrackedLink
              href="/how-it-works"
              analyticsName="trust_how_it_works_link"
              className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-2.5 text-sm font-semibold text-stone-200 hover:bg-stone-800"
            >
              How booking paths work
            </TrackedLink>
            <TrackedLink
              href="/pricing"
              analyticsName="trust_pricing_link"
              className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-2.5 text-sm font-semibold text-stone-200 hover:bg-stone-800"
            >
              Pricing source of truth
            </TrackedLink>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <article className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-2xl font-semibold text-stone-100">What We Verify</h2>
          <ul className="mt-4 space-y-3">
            {VERIFY_POINTS.map((point) => (
              <li key={point} className="text-sm leading-relaxed text-stone-300">
                - {point}
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-2xl font-semibold text-stone-100">What We Do Not Verify</h2>
          <ul className="mt-4 space-y-3">
            {DO_NOT_VERIFY_POINTS.map((point) => (
              <li key={point} className="text-sm leading-relaxed text-stone-300">
                - {point}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="border-y border-stone-700/50 bg-stone-900/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-display tracking-tight text-stone-100">
              What a profile badge actually means
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-stone-300">
              Buyer trust gets weaker when records, marketing copy, and support promises blur
              together. ChefFlow separates them on purpose.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {BADGE_EVIDENCE_CARDS.map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5"
              >
                <h3 className="text-lg font-semibold text-stone-100">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-stone-300">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-stone-700/50 bg-stone-900/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-display tracking-tight text-stone-100">
              Payment, cancellation, and support expectations
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-stone-300">
              ChefFlow has different public booking paths, but the trust posture is the same: review
              the written terms before paying, use the chef contact path first, and use support for
              escalation when the issue is bigger than routine planning.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {PROCESS_CARDS.map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5"
              >
                <h3 className="text-lg font-semibold text-stone-100">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-stone-300">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6">
            <h2 className="text-2xl font-semibold text-stone-100">Support Escalation</h2>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed text-stone-300">
              {ESCALATION_STEPS.map((step, index) => (
                <li key={step}>
                  {index + 1}. {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6">
            <h2 className="text-2xl font-semibold text-stone-100">References</h2>
            <div className="mt-5 grid gap-3">
              <TrackedLink
                href="/how-it-works"
                analyticsName="trust_reference_how_it_works"
                className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-3 text-sm font-semibold text-stone-200 hover:bg-stone-800"
              >
                How It Works
              </TrackedLink>
              <TrackedLink
                href="/pricing"
                analyticsName="trust_reference_pricing"
                className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-3 text-sm font-semibold text-stone-200 hover:bg-stone-800"
              >
                Pricing
              </TrackedLink>
              <TrackedLink
                href="/contact"
                analyticsName="trust_reference_contact"
                className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-3 text-sm font-semibold text-stone-200 hover:bg-stone-800"
              >
                Contact
              </TrackedLink>
              <a
                href="mailto:support@cheflowhq.com"
                className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-3 text-sm font-semibold text-stone-200 hover:bg-stone-800"
              >
                support@cheflowhq.com
              </a>
              <a
                href="mailto:security@cheflowhq.com"
                className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-3 text-sm font-semibold text-stone-200 hover:bg-stone-800"
              >
                security@cheflowhq.com
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6">
            <h2 className="text-2xl font-semibold text-stone-100">Support Can Help With</h2>
            <ul className="mt-4 space-y-3">
              {SUPPORT_CAN_HELP.map((point) => (
                <li key={point} className="text-sm leading-relaxed text-stone-300">
                  - {point}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6">
            <h2 className="text-2xl font-semibold text-stone-100">Support Cannot Do</h2>
            <ul className="mt-4 space-y-3">
              {SUPPORT_CANNOT_HELP.map((point) => (
                <li key={point} className="text-sm leading-relaxed text-stone-300">
                  - {point}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="border-y border-stone-700/50 bg-stone-900/40">
        <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="text-center">
            <h2 className="fluid-display-lg font-display tracking-tight text-stone-100">
              Want to test these workflows in your own operation?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-300">
              {isBeta
                ? 'Join the beta waitlist and work directly with product during setup.'
                : 'Sign up free and validate inquiry, event, and payout workflows end-to-end.'}
            </p>
            <TrackedLink
              href={buildMarketingSignupHref({
                sourcePage: 'trust',
                sourceCta: 'bottom_primary',
              })}
              analyticsName="trust_primary_cta"
              analyticsProps={{ launch_mode: LAUNCH_MODE }}
              className="mt-8 inline-flex items-center rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              {PRIMARY_SIGNUP_LABEL}
            </TrackedLink>
            <p className="mt-4 text-xs text-stone-500">
              Looking to hire a chef instead? Start with{' '}
              <Link
                href="/how-it-works"
                className="font-medium text-brand-400 hover:text-brand-300"
              >
                how the booking paths work
              </Link>
              .
            </p>
          </div>
          <PublicSecondaryEntryCluster
            links={PUBLIC_SECONDARY_ENTRY_CONFIG.trust}
            heading="Looking to book a private chef?"
            theme="dark"
          />
        </div>
      </section>
    </div>
  )
}
