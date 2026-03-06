import type { Metadata } from 'next'
import { CalendarDays, CreditCard, UsersRound } from '@/components/ui/icons'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { ARCHETYPES } from '@/lib/archetypes/presets'
import { LAUNCH_MODE, PRIMARY_SIGNUP_HREF, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'
import {
  PLATFORM_HERO_COPY,
  PLATFORM_HERO_HEADLINE,
  PLATFORM_KEYWORDS,
  PLATFORM_META_DESCRIPTION,
  PLATFORM_NAME,
  PLATFORM_SHORT_DESCRIPTION,
} from '@/lib/marketing/platform-positioning'
import { WorkflowSteps } from '@/components/public/workflow-steps'
import { HowItWorksSection } from '@/components/public/how-it-works-section'
import { MeetRemySection } from '@/components/public/meet-remy-section'
import {
  OrganizationJsonLd,
  WebSiteJsonLd,
  SoftwareApplicationJsonLd,
} from '@/components/seo/json-ld'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: `${PLATFORM_NAME} | Food Business Operating System`,
  description: PLATFORM_META_DESCRIPTION,
  keywords: PLATFORM_KEYWORDS,
  openGraph: {
    title: `${PLATFORM_NAME} | Food Business Operating System`,
    description: PLATFORM_SHORT_DESCRIPTION,
    url: BASE_URL,
    siteName: PLATFORM_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${PLATFORM_NAME} | Food Business Operating System`,
    description:
      LAUNCH_MODE === 'public'
        ? `${PLATFORM_SHORT_DESCRIPTION} 14-day free trial.`
        : `${PLATFORM_SHORT_DESCRIPTION} Closed beta now open.`,
  },
  alternates: {
    canonical: BASE_URL,
  },
}

const FEATURES = [
  {
    icon: CalendarDays,
    title: 'Mirror every marketplace booking',
    description:
      'Pull requests, event dates, guest notes, and follow-up tasks into one owned record even when the booking starts on another platform.',
  },
  {
    icon: UsersRound,
    title: 'Keep the client relationship',
    description:
      'Store household preferences, dietary history, kitchen notes, anniversaries, and repeat-client context that marketplaces do not preserve for your business.',
  },
  {
    icon: CreditCard,
    title: 'See the money after fees',
    description:
      'Track gross booking value, platform fees, payouts, expenses, and real profit so every dinner is measured beyond the marketplace payout screen.',
  },
]

const MARKETPLACE_BRIDGE = [
  {
    eyebrow: 'Keep Your Channels',
    title: 'Leave booking demand where it already works.',
    description:
      'ChefFlow does not ask you to abandon the channels already bringing you leads. Keep your current booking flow. Use ChefFlow for the business layer around that demand.',
  },
  {
    eyebrow: 'Own The Record',
    title: 'Capture everything the marketplace does not remember for you.',
    description:
      'Once a lead becomes real, ChefFlow keeps the client memory: preferences, dislikes, allergies, kitchen access, service notes, pricing history, and all the operational context you need next time.',
  },
  {
    eyebrow: 'Grow Beyond It',
    title: 'Turn one platform dinner into repeat direct business.',
    description:
      'Follow-ups, direct booking links, review asks, rebook reminders, and margin tracking stay in your system so each marketplace booking can become a longer client relationship.',
  },
]

export default function Home() {
  const isBeta = LAUNCH_MODE === 'beta'

  return (
    <div className="overflow-x-clip">
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <SoftwareApplicationJsonLd />

      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[60px]" />
        <div className="pointer-events-none absolute -right-10 top-10 h-[250px] w-[250px] rounded-full bg-brand-800/25 blur-[50px]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-16 pt-20 text-center sm:px-6 md:pb-20 md:pt-24 lg:px-8">
          <h1 className="max-w-4xl fluid-display-xl font-display tracking-tight text-stone-100">
            {PLATFORM_HERO_HEADLINE}
          </h1>
          <p className="mt-4 rounded-full border border-brand-700 bg-stone-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            Built for private chefs growing through marketplaces, referrals, and direct bookings
          </p>
          <p className="mt-6 max-w-2xl text-[1.0625rem] leading-8 text-stone-300 md:text-lg">
            {PLATFORM_HERO_COPY}
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-400">
            Independent platform built to complement your existing booking channels.
          </p>
          <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <TrackedLink
              href={PRIMARY_SIGNUP_HREF}
              analyticsName="home_hero_signup"
              analyticsProps={{ section: 'hero' }}
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              {PRIMARY_SIGNUP_LABEL}
            </TrackedLink>
            <TrackedLink
              href="/pricing"
              analyticsName="home_hero_pricing"
              analyticsProps={{ section: 'hero' }}
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-stone-600 bg-stone-900 px-6 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
            >
              See pricing
            </TrackedLink>
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="cq-shell">
          <div className="cq-grid-two">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <article
                  key={feature.title}
                  className="rounded-xl border border-stone-700 bg-stone-900 p-6 shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5"
                >
                  <div className="mb-4 inline-flex rounded-lg bg-brand-950 p-2.5 text-brand-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-semibold text-stone-100">{feature.title}</h2>
                  <p className="mt-2 text-[0.95rem] leading-7 text-stone-300">
                    {feature.description}
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 md:pb-14 lg:px-8">
        <div className="rounded-2xl border border-stone-700 bg-gradient-to-br from-stone-900 via-stone-900 to-brand-950/40 p-6 md:p-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
              Marketplace Strategy
            </p>
            <h2 className="mt-2 text-2xl font-display tracking-tight text-stone-100 md:text-3xl">
              ChefFlow sits on top of your booking channels instead of fighting them.
            </h2>
            <p className="mt-3 text-[0.95rem] leading-7 text-stone-300 md:text-base">
              If most of your dinners start on a booking platform, ChefFlow should become the place
              where the business actually lives: client memory, prep, service documents, margin
              tracking, follow-up, and repeat booking strategy.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {MARKETPLACE_BRIDGE.map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-stone-700 bg-stone-950/70 p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
                  {item.eyebrow}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-stone-100">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-300">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 md:pb-14 lg:px-8">
        <div className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6 md:p-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
              Business Types
            </p>
            <h2 className="mt-2 text-2xl font-display tracking-tight text-stone-100 md:text-3xl">
              Start with the workflow that fits your business model.
            </h2>
            <p className="mt-2 text-[0.95rem] leading-7 text-stone-300 md:text-base">
              New accounts choose a starting layout during onboarding. Nothing gets locked out. The
              platform simply opens with the modules and navigation that make sense for your format.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ARCHETYPES.map((archetype) => (
              <article
                key={archetype.id}
                className="rounded-xl border border-stone-700 bg-stone-950/70 p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {archetype.emoji}
                  </span>
                  <h3 className="text-lg font-semibold text-stone-100">{archetype.label}</h3>
                </div>
                <p className="mt-3 text-sm leading-7 text-stone-300">{archetype.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 md:pb-14 lg:px-8">
        <div className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
                Evaluation Ready
              </p>
              <h2 className="mt-2 text-2xl font-display tracking-tight text-stone-100 md:text-3xl">
                Compare ChefFlow before you switch your stack.
              </h2>
              <p className="mt-2 max-w-2xl text-[0.95rem] leading-7 text-stone-300 md:text-base">
                See how ChefFlow fits next to spreadsheets, generic CRM stacks, and your current
                booking channels without forcing you to abandon the sources already bringing you
                bookings.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <TrackedLink
                href="/compare"
                analyticsName="home_eval_compare"
                analyticsProps={{ section: 'evaluation' }}
                className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                View comparisons
              </TrackedLink>
              <TrackedLink
                href="/faq"
                analyticsName="home_eval_faq"
                analyticsProps={{ section: 'evaluation' }}
                className="inline-flex items-center justify-center rounded-lg border border-stone-600 bg-stone-900 px-5 py-2.5 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
              >
                Read FAQ
              </TrackedLink>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-y border-stone-700/50 bg-stone-900/40 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="fluid-display-lg font-display tracking-tight text-stone-100">
              From marketplace request to repeat direct client in one flow.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[1.02rem] leading-8 text-stone-300">
              Keep the full private-chef journey in one system, even when the first booking starts
              somewhere else.
            </p>
          </div>
          <WorkflowSteps />
        </div>
      </section>

      <MeetRemySection />

      <HowItWorksSection />

      <section className="relative mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6 md:py-20 lg:px-8">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[200px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-800/20 blur-[50px]" />
        {isBeta && (
          <p className="relative mx-auto mb-4 inline-flex rounded-full border border-brand-700 bg-stone-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            Closed Beta
          </p>
        )}
        <h2 className="relative fluid-display-lg font-display tracking-tight text-stone-100">
          {isBeta
            ? 'Ready to shape ChefFlow for your private chef business?'
            : 'Ready to keep the marketplace and still own your business?'}
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-[1.02rem] leading-8 text-stone-300">
          {isBeta
            ? "We're onboarding a small group of chef-led businesses that want stronger control after the marketplace booking."
            : 'Start organizing the client, operational, and financial layer that marketplace platforms do not own for you.'}
        </p>
        <TrackedLink
          href={PRIMARY_SIGNUP_HREF}
          analyticsName="home_final_signup"
          analyticsProps={{ section: 'final_cta' }}
          className="relative mt-8 inline-flex items-center justify-center rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          {PRIMARY_SIGNUP_LABEL}
        </TrackedLink>
      </section>
    </div>
  )
}
