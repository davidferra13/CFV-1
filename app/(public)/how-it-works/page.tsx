import type { Metadata } from 'next'
import Link from 'next/link'
import {
  PUBLIC_OPERATOR_ENTRY,
  PUBLIC_PRIMARY_CONSUMER_CTA,
} from '@/lib/public/public-surface-config'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

const CLIENT_PATHS = [
  {
    title: 'Open request',
    body: 'Describe your event on the booking form. ChefFlow shares the request only with matched chefs in the area. No payment is due at this stage, and the request is not a confirmed booking.',
  },
  {
    title: 'Direct chef inquiry',
    body: 'When you choose a chef profile, your details go directly to that chef. The next step is menu, pricing, timing, and fit. No payment is due when you send the inquiry.',
  },
  {
    title: 'Instant book when offered',
    body: 'Some chefs may enable an instant-book path. In that case, Stripe checkout collects the deposit and the booking is confirmed after payment succeeds.',
  },
]

const DIRECT_INQUIRY_CHECKLIST = [
  'Event date, city, and venue type',
  'Guest count and the kind of service you want',
  'Budget range and dietary constraints',
  'Any timing, kitchen-access, or travel limitations that could affect fit',
]

export const metadata: Metadata = {
  title: 'How ChefFlow Works - For Clients and Chefs',
  description:
    'Browse the current chef directory or describe your event. ChefFlow routes your request to matched chefs or directly to the chef you choose, with route-specific payment and response expectations.',
  openGraph: {
    title: 'How ChefFlow Works',
    description:
      'Understand the real ChefFlow booking paths: matched-chef requests, direct chef inquiries, and instant-book deposits when offered.',
    url: `${BASE_URL}/how-it-works`,
    siteName: 'ChefFlow',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'How ChefFlow Works',
    description:
      'Understand the real ChefFlow booking paths: matched-chef requests, direct chef inquiries, and instant-book deposits when offered.',
  },
  alternates: {
    canonical: `${BASE_URL}/how-it-works`,
  },
}

export default function HowItWorksPage() {
  return (
    <main>
      <section className="mx-auto w-full max-w-4xl px-4 pt-20 pb-8 sm:px-6 md:pt-28 md:pb-12 lg:px-8">
        <h1 className="text-3xl font-display tracking-tight text-white md:text-4xl lg:text-5xl">
          How it works
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-stone-300">
          ChefFlow does not use one generic booking path. You can browse the current directory,
          send an open request to matched chefs, or contact a specific chef directly. Some chefs
          may also offer instant booking with a Stripe deposit.
        </p>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {CLIENT_PATHS.map((path) => (
            <article
              key={path.title}
              className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5"
            >
              <h2 className="text-base font-semibold text-stone-100">{path.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-stone-400">{path.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
          <h2 className="text-base font-semibold text-stone-100">Before you inquire directly</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-400">
            A strong direct inquiry helps the chef decide faster. Some profiles publish a response
            window, policies, and current-record badges, but those signals are profile-specific and
            not a marketplace-wide guarantee.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {DIRECT_INQUIRY_CHECKLIST.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-3 text-sm text-stone-300"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 pb-14 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold text-stone-100">If you are looking for a chef</h2>
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
            <h3 className="text-sm font-semibold text-stone-200">
              1. Browse the current directory or describe your event
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-400">
              You can browse the{' '}
              <Link href="/chefs" className="text-brand-400 hover:underline">
                chef directory
              </Link>{' '}
              and reach out to a specific chef, or use the{' '}
              <Link href="/book" className="text-brand-400 hover:underline">
                booking form
              </Link>{' '}
              to describe your event and let matched chefs decide whether to reply. The directory is
              curated, and ChefFlow accepts requests from anywhere in the United States.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
            <h3 className="text-sm font-semibold text-stone-200">
              2. The next step depends on the path you chose
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-400">
              Open booking shares your request with matched chefs. Direct inquiry goes only to the
              chef whose profile you chose. Instant-book, when enabled, confirms the date after a
              Stripe deposit. The path matters because reply timing and payment expectations are not
              the same across all three.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
            <h3 className="text-sm font-semibold text-stone-200">
              3. Review written terms before you pay
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-400">
              Menu, pricing, deposit, cancellation, and what-is-included terms come from the chef
              agreement or booking terms. ChefFlow does not publish one universal refund rule for
              every chef. Read the written terms before you commit or pay.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-800/40">
        <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold text-stone-100">If you are a chef</h2>
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
              <h3 className="text-sm font-semibold text-stone-200">Create your public profile</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">
                Sign up, publish your services, cuisines, service area, pricing guidance, and
                policies. Directory approval is a profile-quality review, not a background check.
              </p>
            </div>
            <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
              <h3 className="text-sm font-semibold text-stone-200">Publish trust signals clearly</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">
                If you upload insurance or certification records, ChefFlow can surface public badges
                on your profile. Self-reported service settings help buyers plan, but they do not
                create a current-record badge on their own. Sample menus, pricing guidance,
                response-time signals, and gallery photos make the page more buyer-ready.
              </p>
            </div>
            <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
              <h3 className="text-sm font-semibold text-stone-200">
                Run the workflow from inquiry to payout
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">
                ChefFlow covers inquiry intake, proposals, menu costing, event management, payment
                records, and reconciliation. Core workflows are free today, and the exact current
                pricing state lives on the{' '}
                <Link href="/pricing" className="text-brand-400 hover:underline">
                  pricing page
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-800/40">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
            <h2 className="text-xl font-semibold text-stone-100">Need the trust details?</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-400">
              Review the{' '}
              <Link href="/trust" className="text-brand-400 hover:underline">
                Trust Center
              </Link>{' '}
              for the plain-English version of what ChefFlow verifies, what it does not verify, how
              payment records work, and how support escalation starts.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-800/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-14 text-center sm:px-6 md:py-18 lg:px-8">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href={PUBLIC_PRIMARY_CONSUMER_CTA.href}
              className="inline-flex h-12 items-center justify-center rounded-xl gradient-accent px-6 text-sm font-semibold text-white glow-hover shadow-lg"
            >
              {PUBLIC_PRIMARY_CONSUMER_CTA.label}
            </Link>
            <Link
              href={PUBLIC_OPERATOR_ENTRY.href}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-stone-700 bg-stone-900/60 px-6 text-sm font-medium text-stone-300 transition-all hover:bg-stone-800 hover:border-stone-600 hover:text-stone-100"
            >
              {PUBLIC_OPERATOR_ENTRY.label}
            </Link>
          </div>
          <PublicSecondaryEntryCluster
            links={PUBLIC_SECONDARY_ENTRY_CONFIG.how_it_works}
            theme="dark"
          />
        </div>
      </section>
    </main>
  )
}
