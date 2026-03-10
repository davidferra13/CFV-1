import type { Metadata } from 'next'
import { CalendarDays, CreditCard, UsersRound } from '@/components/ui/icons'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { LAUNCH_MODE, PRIMARY_SIGNUP_HREF, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'
import {
  PLATFORM_HERO_COPY,
  PLATFORM_HERO_HEADLINE,
  PLATFORM_KEYWORDS,
  PLATFORM_META_DESCRIPTION,
  PLATFORM_NAME,
  PLATFORM_SHORT_DESCRIPTION,
} from '@/lib/marketing/platform-positioning'
import { MeetRemySection } from '@/components/public/meet-remy-section'
import {
  OrganizationJsonLd,
  WebSiteJsonLd,
  SoftwareApplicationJsonLd,
} from '@/components/seo/json-ld'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: `${PLATFORM_NAME} | Ops for Artists`,
  description: PLATFORM_META_DESCRIPTION,
  keywords: PLATFORM_KEYWORDS,
  openGraph: {
    title: `${PLATFORM_NAME} | Ops for Artists`,
    description: PLATFORM_SHORT_DESCRIPTION,
    url: BASE_URL,
    siteName: PLATFORM_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${PLATFORM_NAME} | Ops for Artists`,
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
    title: 'One record per client',
    description:
      'Every booking, dietary note, and conversation in one place. No more digging through texts and emails to remember what a client needs.',
  },
  {
    icon: UsersRound,
    title: 'Client memory that compounds',
    description:
      "Allergies, kitchen access, anniversaries, kids' names, pricing history. The details that turn a first dinner into a tenth.",
  },
  {
    icon: CreditCard,
    title: 'Real margin visibility',
    description:
      'After every event, see exactly what you made. The actual number, after food cost and expenses. Not a guess.',
  },
]

export default function Home() {
  const isBeta = LAUNCH_MODE === 'beta'

  return (
    <div className="overflow-x-clip">
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <SoftwareApplicationJsonLd />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[60px]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-16 pt-20 text-center sm:px-6 md:pb-20 md:pt-24 lg:px-8">
          <h1 className="max-w-3xl fluid-display-xl font-display tracking-tight text-stone-100">
            {PLATFORM_HERO_HEADLINE}
          </h1>
          <p className="mt-6 max-w-xl text-[1.0625rem] leading-8 text-stone-300 md:text-lg">
            {PLATFORM_HERO_COPY}
          </p>
          <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:flex-row">
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
          <p className="mt-4 text-xs text-stone-500">
            No credit card required. Free tier available.
          </p>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-b border-stone-700/50">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-center gap-6 px-4 py-5 text-sm text-stone-400 sm:gap-8 sm:px-6 lg:px-8">
          <span>Payments via Stripe</span>
          <span className="text-stone-700">·</span>
          <span>Calendar sync built in</span>
          <span className="text-stone-700">·</span>
          <span>Your data stays yours</span>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <article
                key={feature.title}
                className="rounded-xl border border-stone-700 bg-stone-900 p-6 shadow-[var(--shadow-card)]"
              >
                <div className="mb-4 inline-flex rounded-lg bg-brand-950 p-2.5 text-brand-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-stone-100">{feature.title}</h2>
                <p className="mt-2 text-sm leading-7 text-stone-300">{feature.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      {/* Built-in workflow support */}
      <MeetRemySection />

      {/* Final CTA */}
      <section className="relative mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6 md:py-20 lg:px-8">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[200px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-800/20 blur-[50px]" />
        {isBeta && (
          <p className="relative mx-auto mb-4 inline-flex rounded-full border border-brand-700 bg-stone-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            Closed Beta
          </p>
        )}
        <h2 className="relative fluid-display-lg font-display tracking-tight text-stone-100">
          {isBeta
            ? 'Built with working chefs. Not for them.'
            : 'Stop losing clients to forgotten follow-ups.'}
        </h2>
        <p className="relative mx-auto mt-4 max-w-lg text-base leading-relaxed text-stone-300">
          {isBeta
            ? 'Small group. Direct input. Your workflow shapes the product.'
            : 'Start free. Used daily by working private chefs.'}
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
