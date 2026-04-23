import type { Metadata } from 'next'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { BetaSignupForm } from '@/components/beta/beta-signup-form'
import { ArrowRight, BadgeDollarSign, ClipboardList, Repeat, Users } from '@/components/ui/icons'
import { getBetaSignupCount } from '@/lib/beta/actions'
import { BETA_CAPACITY } from '@/lib/beta/constants'
import { buildOperatorWalkthroughHref } from '@/lib/marketing/walkthrough-links'

type BetaSignupPageProps = {
  searchParams?: {
    source_cta?: string | string[]
    source_page?: string | string[]
  }
}

const OPERATOR_BENEFITS = [
  {
    icon: Users,
    title: 'Client memory',
    description:
      'Keep households, preferences, allergies, and repeat-booking context in one record.',
  },
  {
    icon: ClipboardList,
    title: 'Service execution',
    description:
      'Move from inquiry to prep, shopping, staffing, and day-of delivery without inbox drift.',
  },
  {
    icon: BadgeDollarSign,
    title: 'Margin discipline',
    description:
      'Track pricing, groceries, labor, and payout reality so growth is measured against profit.',
  },
]

const BETA_FIT = [
  'Private chefs running dinners, meal prep, or recurring household service',
  'Caterers and chef-led hospitality teams juggling repeat clients and event logistics',
  'Marketplace-first operators who need their own system behind booking demand',
]

const BETA_PROGRAM = [
  'Founder-led onboarding with direct workflow feedback',
  'Early access shaped around real chef operations, not generic CRM patterns',
  'No credit card required while access is rolling out',
]

function getSearchParamValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0]
  return value
}

export const metadata: Metadata = {
  title: 'Request Early Access',
  description:
    'Apply for early access to ChefFlow, the operating system for private chefs and chef-led teams. Limited spots available.',
  openGraph: {
    title: 'Request Early Access to ChefFlow',
    description:
      'Request early access to the chef operating system built for client memory, service execution, and repeat growth.',
    url: 'https://cheflowhq.com/beta',
    siteName: 'ChefFlow',
  },
}

export default async function BetaSignupPage({ searchParams }: BetaSignupPageProps) {
  const signupCount = await getBetaSignupCount()
  const sourcePage = getSearchParamValue(searchParams?.source_page)?.trim()
  const sourceCta = getSearchParamValue(searchParams?.source_cta)?.trim()
  const remainingSpots = Math.max(BETA_CAPACITY - signupCount, 0)
  const fillPercent = Math.min((signupCount / BETA_CAPACITY) * 100, 100)

  return (
    <div className="overflow-x-clip">
      <PublicPageView
        pageName="beta_signup"
        properties={{
          section: 'operator_growth',
          ...(sourcePage ? { source_page: sourcePage } : {}),
          ...(sourceCta ? { source_cta: sourceCta } : {}),
        }}
      />

      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[460px] w-[820px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[95px]" />
        <div className="pointer-events-none absolute right-0 top-12 h-[300px] w-[320px] rounded-full bg-brand-800/20 blur-[75px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[260px] w-[320px] rounded-full bg-orange-950/20 blur-[85px]" />

        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-start lg:px-8">
          <div>
            <p className="inline-flex rounded-full border border-brand-700 bg-stone-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
              Early access for chefs and operators
            </p>
            <h1 className="mt-5 max-w-4xl fluid-display-xl font-display tracking-tight text-stone-100">
              Request access to the operator system behind every booking.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-stone-300 md:text-lg">
              ChefFlow is for chefs who need more than a booking channel. Keep demand flowing from
              marketplaces, referrals, venues, and repeat households. Run client memory, event
              execution, and margin visibility inside one owned workspace.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {OPERATOR_BENEFITS.map((item) => {
                const Icon = item.icon

                return (
                  <article
                    key={item.title}
                    className="rounded-2xl border border-stone-700 bg-stone-900/80 p-5 shadow-[var(--shadow-card)]"
                  >
                    <div className="inline-flex rounded-xl bg-brand-950 p-2.5 text-brand-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-stone-100">{item.title}</h2>
                    <p className="mt-2 text-sm leading-7 text-stone-300">{item.description}</p>
                  </article>
                )
              })}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
                  Best fit
                </p>
                <ul className="mt-4 space-y-3">
                  {BETA_FIT.map((item) => (
                    <li key={item} className="text-sm leading-7 text-stone-300">
                      - {item}
                    </li>
                  ))}
                </ul>
              </article>

              <article className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
                  Early access program
                </p>
                <ul className="mt-4 space-y-3">
                  {BETA_PROGRAM.map((item) => (
                    <li key={item} className="text-sm leading-7 text-stone-300">
                      - {item}
                    </li>
                  ))}
                </ul>
              </article>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <TrackedLink
                href="/marketplace-chefs"
                analyticsName="beta_operator_context"
                analyticsProps={{ section: 'hero' }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-600 bg-stone-900 px-5 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
              >
                See the operator workflow
                <ArrowRight className="h-4 w-4" />
              </TrackedLink>
              <TrackedLink
                href={buildOperatorWalkthroughHref({
                  sourcePage: 'beta_signup',
                  sourceCta: 'hero_walkthrough',
                })}
                analyticsName="beta_contact_walkthrough"
                analyticsProps={{ section: 'hero' }}
                className="inline-flex items-center justify-center rounded-xl border border-stone-600 bg-stone-900 px-5 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
              >
                Request operator walkthrough
              </TrackedLink>
            </div>
          </div>

          <aside className="rounded-[28px] border border-stone-700 bg-stone-900/85 p-6 shadow-[var(--shadow-card)] md:p-8">
            <div className="rounded-2xl border border-brand-700/40 bg-brand-950/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
                Access status
              </p>
              <p className="mt-2 text-3xl font-display tracking-tight text-stone-100">
                {signupCount} of {BETA_CAPACITY} spots requested
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-300">
                {remainingSpots > 0
                  ? `${remainingSpots} spots are still opening in this rollout window.`
                  : 'Current access window is full. New requests join the waitlist.'}
              </p>
            </div>

            <div className="mt-6">
              <h2 className="text-2xl font-display tracking-tight text-stone-100">
                Request operator access
              </h2>
              <p className="mt-3 text-sm leading-7 text-stone-300">
                Start with name and email. Add optional context if you want onboarding tailored to
                your current workflow.
              </p>
            </div>

            <div className="relative mt-6">
              <BetaSignupForm />
            </div>

            <div className="mt-6 rounded-2xl border border-stone-700 bg-stone-950/70 p-4">
              <p className="text-sm leading-7 text-stone-300">
                No credit card required. We email access updates as rollout progresses.
              </p>
              <p className="mt-2 text-xs text-stone-500">
                Your information is not shared. Review the privacy policy before submitting.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-18 lg:px-8">
        <div className="rounded-3xl border border-stone-700 bg-stone-900/80 p-6 shadow-[var(--shadow-card)] md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
            Why this rollout exists
          </p>
          <h2 className="mt-3 text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
            Marketplace demand is only the front end. ChefFlow is for the operating layer after the
            inquiry lands.
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-stone-700 bg-stone-950/70 p-5">
              <p className="text-sm font-semibold text-stone-100">Demand keeps moving</p>
              <p className="mt-2 text-sm leading-7 text-stone-300">
                Keep the channels that already generate inquiries while you build your own system
                underneath them.
              </p>
            </div>
            <div className="rounded-2xl border border-stone-700 bg-stone-950/70 p-5">
              <p className="text-sm font-semibold text-stone-100">Repeat business compounds</p>
              <p className="mt-2 text-sm leading-7 text-stone-300">
                The second and third booking should get easier because the client, menu, and event
                history already exist.
              </p>
            </div>
            <div className="rounded-2xl border border-stone-700 bg-stone-950/70 p-5">
              <p className="text-sm font-semibold text-stone-100">Operator discipline matters</p>
              <p className="mt-2 text-sm leading-7 text-stone-300">
                Strong service businesses need margin visibility, execution control, and reliable
                handoffs, not another ad hoc inbox.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
