import type { Metadata } from 'next'
import {
  ArrowRight,
  BadgeDollarSign,
  ClipboardList,
  Repeat,
  ShieldCheck,
  Users,
} from '@/components/ui/icons'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { LAUNCH_MODE, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'
import { readMarketingSourceFromSearchParams } from '@/lib/marketing/source-links'
import { buildMarketingSignupHref } from '@/lib/marketing/signup-links'
import { buildOperatorWalkthroughHref } from '@/lib/marketing/walkthrough-links'
import { buildMarketingMetadata } from '@/lib/site/public-site'

export const metadata: Metadata = {
  ...buildMarketingMetadata({
    title: 'Marketplace Chefs - Own the Business Behind the Booking',
    description:
      'ChefFlow is for private chefs whose leads start on marketplaces, travel platforms, and referrals. Keep the lead source, capture client memory, run service ops, track margin, and grow repeat direct work.',
    path: '/marketplace-chefs',
    imagePath: '/social/chefflow-operators.png',
    imageAlt: 'ChefFlow workflow for marketplace chefs',
    openGraphTitle: 'Marketplace Chefs - Own the business behind the booking',
  }),
  robots: { index: true, follow: true },
}

type MarketplaceChefsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const CHEF_INFRASTRUCTURE_AREAS = [
  {
    icon: Users,
    title: 'Keep a reusable client record',
    description:
      'Store household preferences, allergies, dislikes, kitchen access notes, timing, and pricing history somewhere that belongs to your business instead of disappearing after the platform job.',
  },
  {
    icon: ClipboardList,
    title: 'Run service from one ops system',
    description:
      'Move inquiries, prep lists, shopping notes, packing checks, staff details, and follow-up tasks out of inbox threads and into one workflow.',
  },
  {
    icon: BadgeDollarSign,
    title: 'See payout against real margin',
    description:
      'Track booking value, marketplace fees, groceries, labor, travel, and profit so you can tell whether a marketplace dinner was actually worth doing.',
  },
  {
    icon: Repeat,
    title: 'Turn one-off guests into repeat work',
    description:
      'Use the first platform booking to create a repeatable relationship with follow-up reminders, direct rebooking context, and a cleaner second booking.',
  },
]

const MARKETPLACE_ROLE = [
  'Discovery, search ranking, and first-touch demand',
  'In-platform request flow and required guest messaging',
  'Marketplace-specific booking rules and payout rails',
  'Early lead volume you do not want to break',
]

const CHEFFLOW_ROLE = [
  'Client memory that survives the first booking',
  'Menu, prep, staffing, documents, and service execution',
  'Fee-aware margin tracking and payout reconciliation',
  'Repeat direct booking follow-up after the dinner is done',
]

const DEMAND_SOURCES = [
  'Marketplace inquiries',
  'Travel and hospitality referrals',
  'Venue and concierge introductions',
  'Repeat households and direct outreach',
]

const MARKETPLACE_PLAYBOOK = [
  {
    step: '01',
    title: 'Keep discovery where it already works.',
    description:
      'If a marketplace or travel platform already sends you qualified leads, keep using it for lead generation instead of forcing an early migration.',
  },
  {
    step: '02',
    title: 'Move active work into ChefFlow immediately.',
    description:
      'As soon as the booking becomes real, run the client record, event prep, documents, and service execution in a system you control.',
  },
  {
    step: '03',
    title: 'Save the data that compounds after service.',
    description:
      'Each completed dinner should leave behind reusable context: preferences, timing, notes, pricing, profitability, and the best angle for the next booking.',
  },
  {
    step: '04',
    title: 'Use the next booking to deepen the relationship.',
    description:
      'The point is not to fight the first booking source. The point is to stop starting from zero every time a guest comes back.',
  },
]

export default async function MarketplaceChefsPage({ searchParams }: MarketplaceChefsPageProps) {
  const isBeta = LAUNCH_MODE === 'beta'
  const marketingSource = readMarketingSourceFromSearchParams((await searchParams) ?? undefined)

  return (
    <div className="overflow-x-clip">
      <PublicPageView
        pageName="marketplace_chefs"
        properties={{
          section: 'marketplace_chef_growth',
          ...(marketingSource.sourcePage ? { source_page: marketingSource.sourcePage } : {}),
          ...(marketingSource.sourceCta ? { source_cta: marketingSource.sourceCta } : {}),
        }}
      />

      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[90px]" />
        <div className="pointer-events-none absolute right-0 top-10 h-[260px] w-[260px] rounded-full bg-brand-800/20 blur-[70px]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col px-4 pb-16 pt-20 sm:px-6 md:pb-20 md:pt-24 lg:px-8">
          <p className="inline-flex w-fit rounded-full border border-brand-700 bg-stone-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            For Marketplace Chefs
          </p>
          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-start">
            <div>
              <h1 className="max-w-4xl fluid-display-xl font-display tracking-tight text-stone-100">
                Keep the marketplace booking. Own everything that follows.
              </h1>
              <p className="mt-6 max-w-3xl text-[1.05rem] leading-8 text-stone-300 md:text-lg">
                ChefFlow is built for private chefs whose first lead may come from a marketplace,
                travel platform, concierge, or referral network, but whose real business still needs
                an owned system. Use ChefFlow for client memory, event execution, margin visibility,
                and repeat direct work after the lead arrives.
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-400">
                This is not a replacement marketplace page. It is a business-system page for chefs
                who already book through marketplaces and do not want the client relationship to
                reset after every dinner.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <TrackedLink
                  href={buildMarketingSignupHref({
                    sourcePage: 'marketplace_chefs',
                    sourceCta: 'hero_primary',
                  })}
                  analyticsName="marketplace_chefs_primary_cta"
                  analyticsProps={{ section: 'hero' }}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  {PRIMARY_SIGNUP_LABEL}
                </TrackedLink>
                <TrackedLink
                  href={buildOperatorWalkthroughHref({
                    sourcePage: 'marketplace_chefs',
                    sourceCta: 'hero_walkthrough',
                  })}
                  analyticsName="marketplace_chefs_contact"
                  analyticsProps={{ section: 'hero' }}
                  className="inline-flex items-center justify-center rounded-lg border border-stone-600 bg-stone-900 px-6 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
                >
                  Request operator walkthrough
                </TrackedLink>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6 shadow-[var(--shadow-card)]">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
                Demand Sources ChefFlow Can Support
              </p>
              <div className="mt-5 space-y-4">
                {DEMAND_SOURCES.map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between gap-4 rounded-xl border border-stone-700 bg-stone-950/70 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-stone-200">{item}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-brand-300" />
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-xl border border-brand-700/50 bg-brand-950/40 p-4">
                <p className="text-sm leading-7 text-stone-200">
                  The point is to keep the lead source that works while building a cleaner client
                  record, workflow, and repeat-booking engine behind it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-18 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
            Marketplace Chef Workflow
          </p>
          <h2 className="mt-2 text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
            Marketplace demand solves discovery. It does not solve the business after the lead.
          </h2>
          <p className="mt-4 text-[0.98rem] leading-8 text-stone-300 md:text-base">
            If most of your dinners begin on a platform, you still need your own system for prep,
            execution, follow-up, payout review, and the next booking. That is the gap this page is
            addressing.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {CHEF_INFRASTRUCTURE_AREAS.map((item) => {
            const Icon = item.icon
            return (
              <article
                key={item.title}
                className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6 shadow-[var(--shadow-card)]"
              >
                <div className="inline-flex rounded-lg bg-brand-950 p-2.5 text-brand-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-stone-100">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-300">{item.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="border-y border-stone-700/50 bg-stone-900/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-18 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-stone-700 bg-stone-950/80 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-400">
                Marketplace Still Owns
              </p>
              <h2 className="mt-2 text-2xl font-display tracking-tight text-stone-100">
                The first-touch demand engine
              </h2>
              <ul className="mt-5 space-y-3">
                {MARKETPLACE_ROLE.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm leading-7 text-stone-300"
                  >
                    <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-stone-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-brand-700/40 bg-gradient-to-br from-stone-900 via-stone-900 to-brand-950/40 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
                You Build In ChefFlow
              </p>
              <h2 className="mt-2 text-2xl font-display tracking-tight text-stone-100">
                The business that compounds
              </h2>
              <ul className="mt-5 space-y-3">
                {CHEFFLOW_ROLE.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm leading-7 text-stone-200"
                  >
                    <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-brand-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-18 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
              Marketplace Chef Playbook
            </p>
            <h2 className="mt-2 text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
              How a marketplace booking becomes owned business instead of one more isolated job.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-stone-400">
            This is the simple model for chefs who want marketplace demand without running the rest
            of the company from inboxes, spreadsheets, and memory.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {MARKETPLACE_PLAYBOOK.map((item) => (
            <article
              key={item.step}
              className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6 shadow-[var(--shadow-card)]"
            >
              <p className="text-sm font-semibold tracking-[0.1em] text-brand-300">{item.step}</p>
              <h3 className="mt-3 text-xl font-semibold text-stone-100">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-stone-300">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-2 text-center sm:px-6 md:pb-20 lg:px-8">
        <div className="rounded-3xl border border-stone-700 bg-stone-900/80 px-6 py-10 shadow-[var(--shadow-card)] md:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            Next Step
          </p>
          <h2 className="mt-3 text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
            Use every marketplace dinner to build your own client base and operating history.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[0.98rem] leading-8 text-stone-300 md:text-base">
            Keep the booking channels that already bring demand. Add ChefFlow where ownership
            matters: client memory, operations, margin visibility, and repeat direct growth.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedLink
              href={buildMarketingSignupHref({
                sourcePage: 'marketplace_chefs',
                sourceCta: 'final_primary',
              })}
              analyticsName="marketplace_chefs_bottom_primary_cta"
              analyticsProps={{ section: 'final_cta', launch_mode: LAUNCH_MODE }}
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              {PRIMARY_SIGNUP_LABEL}
            </TrackedLink>
            <TrackedLink
              href={buildOperatorWalkthroughHref({
                sourcePage: 'marketplace_chefs',
                sourceCta: 'final_walkthrough',
              })}
              analyticsName="marketplace_chefs_contact"
              analyticsProps={{ section: 'final_cta' }}
              className="inline-flex items-center justify-center rounded-lg border border-stone-600 bg-stone-900 px-7 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
            >
              Request operator walkthrough
            </TrackedLink>
          </div>
          {isBeta && (
            <p className="mt-5 text-sm leading-7 text-stone-400">
              Beta onboarding is still founder-led so marketplace chefs can shape the workflow
              around how they actually book, prep, deliver, and follow up after platform work.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
