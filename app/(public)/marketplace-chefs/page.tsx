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
import { LAUNCH_MODE, PRIMARY_SIGNUP_HREF, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'ChefFlow for Marketplace-Driven Private Chefs',
  description:
    'A private sales page for chefs who rely on booking platforms and need an owned system for client memory, service ops, margins, and repeat business.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'ChefFlow for Marketplace-Driven Private Chefs',
    description:
      'Keep the booking platform for demand. Use ChefFlow for the business layer behind every client, event, and repeat booking.',
    url: `${BASE_URL}/marketplace-chefs`,
    siteName: 'ChefFlow',
    type: 'website',
  },
}

const CONTROL_AREAS = [
  {
    icon: Users,
    title: 'Own the client record',
    description:
      'Keep household preferences, allergies, dislikes, anniversaries, kitchen access notes, and pricing history in one place that belongs to your business.',
  },
  {
    icon: ClipboardList,
    title: 'Run the event outside the inbox',
    description:
      'Turn a single inquiry into prep timelines, shopping plans, service notes, packing lists, and follow-up tasks instead of managing everything from scattered messages.',
  },
  {
    icon: BadgeDollarSign,
    title: 'Measure real margin',
    description:
      'Track gross booking value, fees, payouts, groceries, labor, and profit so you can see which dinners actually grow the business.',
  },
  {
    icon: Repeat,
    title: 'Convert into repeat direct work',
    description:
      'Use the first booking to build a long-term client relationship with follow-up reminders, direct booking workflows, and repeat-event context.',
  },
]

const PLATFORM_ROLE = [
  'Lead generation and marketplace visibility',
  'In-platform request flow and required guest messaging',
  'Platform booking mechanics and payout handoff',
  'First-touch demand you do not want to disrupt',
]

const CHEFFLOW_ROLE = [
  'CRM for repeat clients, referrals, and off-platform leads',
  'Menu, prep, staffing, documents, and event execution',
  'Fee-aware margin tracking and payout reconciliation',
  'Direct-booking conversion, follow-up, and retention workflows',
]

const GROWTH_STACK = [
  'Marketplace inquiries',
  'Repeat households',
  'Referral leads from hosts, hotels, and concierges',
  'Direct text, email, and Instagram inquiries',
]

const OPERATOR_STEPS = [
  {
    step: '01',
    title: 'Let the marketplace do what it already does well.',
    description:
      'Keep the booking channels that already bring you demand. Do not force a migration that weakens lead flow.',
  },
  {
    step: '02',
    title: 'Move the real work into ChefFlow immediately.',
    description:
      'Once an inquiry becomes active, ChefFlow becomes the system for client memory, event prep, margin tracking, and service coordination.',
  },
  {
    step: '03',
    title: 'Capture everything that would otherwise disappear.',
    description:
      'Every successful dinner should leave behind reusable data: preferences, notes, timing, pricing, profitability, and rebooking opportunities.',
  },
  {
    step: '04',
    title: 'Turn one platform dinner into an owned client base.',
    description:
      'The goal is not to replace your demand source on day one. The goal is to build a business that gets stronger after every platform booking.',
  },
]

export default function MarketplaceChefsPage() {
  const isBeta = LAUNCH_MODE === 'beta'

  return (
    <div className="overflow-x-clip">
      <PublicPageView pageName="marketplace_chefs" properties={{ section: 'private_sales' }} />

      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[90px]" />
        <div className="pointer-events-none absolute right-0 top-10 h-[260px] w-[260px] rounded-full bg-brand-800/20 blur-[70px]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col px-4 pb-16 pt-20 sm:px-6 md:pb-20 md:pt-24 lg:px-8">
          <p className="inline-flex w-fit rounded-full border border-brand-700 bg-stone-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            Private Sales Page
          </p>
          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-start">
            <div>
              <h1 className="max-w-4xl fluid-display-xl font-display tracking-tight text-stone-100">
                Keep the marketplace. Build an owned private-chef business behind it.
              </h1>
              <p className="mt-6 max-w-3xl text-[1.05rem] leading-8 text-stone-300 md:text-lg">
                ChefFlow is built for private chefs whose demand starts on booking platforms but
                whose real business needs to live somewhere else. Keep the marketplace for reach.
                Use ChefFlow for the client record, the event operation, the margin view, and the
                repeat-booking system.
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-400">
                Independent platform designed to complement your current booking channels, not claim
                affiliation with them.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <TrackedLink
                  href={PRIMARY_SIGNUP_HREF}
                  analyticsName="marketplace_chefs_primary_cta"
                  analyticsProps={{ section: 'hero' }}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  {PRIMARY_SIGNUP_LABEL}
                </TrackedLink>
                <TrackedLink
                  href="/contact"
                  analyticsName="marketplace_chefs_contact"
                  analyticsProps={{ section: 'hero' }}
                  className="inline-flex items-center justify-center rounded-lg border border-stone-600 bg-stone-900 px-6 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
                >
                  Book a walkthrough
                </TrackedLink>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6 shadow-[var(--shadow-card)]">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
                What ChefFlow becomes
              </p>
              <div className="mt-5 space-y-4">
                {GROWTH_STACK.map((item) => (
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
                  One workspace for the demand you do not own yet and the business you are trying to
                  own long term.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-18 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">The Gap</p>
          <h2 className="mt-2 text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
            Marketplace demand is strong. Marketplace business infrastructure is not enough.
          </h2>
          <p className="mt-4 text-[0.98rem] leading-8 text-stone-300 md:text-base">
            If most of your dinners begin on a platform, you still need your own system for what
            happens before service, during execution, after payout, and before the next booking.
            That is where ChefFlow fits.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {CONTROL_AREAS.map((item) => {
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
                Booking Platform Keeps
              </p>
              <h2 className="mt-2 text-2xl font-display tracking-tight text-stone-100">
                The demand engine
              </h2>
              <ul className="mt-5 space-y-3">
                {PLATFORM_ROLE.map((item) => (
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
                ChefFlow Owns
              </p>
              <h2 className="mt-2 text-2xl font-display tracking-tight text-stone-100">
                The business layer
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
              Operator Workflow
            </p>
            <h2 className="mt-2 text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
              The model is simple: keep the lead source, own everything that compounds.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-stone-400">
            This is how a marketplace-first chef stops running the business out of inboxes,
            spreadsheets, and memory.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {OPERATOR_STEPS.map((item) => (
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
            Give every platform booking a place to become real business infrastructure.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[0.98rem] leading-8 text-stone-300 md:text-base">
            If your booking channels already work, do not fight them. Add ChefFlow where you need
            ownership: client memory, operations, profit visibility, and repeat direct growth.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedLink
              href={PRIMARY_SIGNUP_HREF}
              analyticsName="marketplace_chefs_bottom_primary_cta"
              analyticsProps={{ section: 'final_cta', launch_mode: LAUNCH_MODE }}
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              {PRIMARY_SIGNUP_LABEL}
            </TrackedLink>
            <TrackedLink
              href="/pricing"
              analyticsName="marketplace_chefs_pricing"
              analyticsProps={{ section: 'final_cta' }}
              className="inline-flex items-center justify-center rounded-lg border border-stone-600 bg-stone-900 px-7 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
            >
              Review pricing
            </TrackedLink>
          </div>
          {isBeta && (
            <p className="mt-5 text-sm leading-7 text-stone-400">
              Beta onboarding is still founder-led so marketplace operators can shape the workflow
              around how they actually book and deliver events.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
