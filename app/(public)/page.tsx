import type { Metadata } from 'next'
import { CalendarDays, CreditCard, UsersRound } from 'lucide-react'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { CUSTOMER_STORIES } from '@/lib/marketing/customer-stories'
import { LAUNCH_MODE, PRIMARY_SIGNUP_HREF, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'
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
  title: 'ChefFlow | Private Chef Business Software - Ops for Artists',
  description:
    'Run your private chef business in one place. Manage inquiries, events, menus, and payments with less admin and more clarity.',
  keywords: [
    'private chef software',
    'personal chef business management',
    'catering management tool',
    'chef business operating system',
    'private chef event management',
    'catering quote software',
    'chef client management',
    'private dinner party planning',
    'chef invoicing software',
    'food costing software',
    'private chef app',
    'catering business software',
    'meal prep business software',
    'private chef contract management',
    'chef scheduling software',
    'personal chef booking system',
    'private chef AI concierge',
    'AI assistant for private chefs',
  ],
  openGraph: {
    title: 'ChefFlow | Private Chef Business Software',
    description:
      'Run your private chef business in one place. Events, clients, menus, and payments in one system.',
    url: BASE_URL,
    siteName: 'ChefFlow',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChefFlow | Ops for Artists',
    description:
      LAUNCH_MODE === 'public'
        ? 'Private chef software for events, clients, menus, and payments. 14-day free trial.'
        : 'Private chef software for events, clients, menus, and payments. Closed beta now open.',
  },
  alternates: {
    canonical: BASE_URL,
  },
}

const FEATURES = [
  {
    icon: CalendarDays,
    title: 'Events & Scheduling',
    description:
      'Every inquiry, proposal, and event - organized in one place. No more juggling apps.',
  },
  {
    icon: UsersRound,
    title: 'Client Experience',
    description:
      'Clients review proposals, approve menus, and pay - all through a polished portal.',
  },
  {
    icon: CreditCard,
    title: 'Payments & Financials',
    description:
      'Invoicing, deposits, and expense tracking built in. Know your margins on every event.',
  },
]

export default function Home() {
  const isBeta = LAUNCH_MODE === 'beta'

  return (
    <div className="overflow-x-clip">
      {/* Structured data for Google rich results */}
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <SoftwareApplicationJsonLd />
      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[60px]" />
        <div className="pointer-events-none absolute -right-10 top-10 h-[250px] w-[250px] rounded-full bg-brand-800/25 blur-[50px]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-16 pt-20 text-center sm:px-6 md:pb-20 md:pt-24 lg:px-8">
          <h1 className="max-w-4xl fluid-display-xl font-display tracking-tight text-stone-100">
            The business OS built by a chef, for chefs.
          </h1>
          <p className="mt-4 rounded-full border border-brand-700 bg-stone-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            Built by chefs for chefs
          </p>
          <p className="mt-6 max-w-2xl text-[1.0625rem] leading-8 text-stone-300 md:text-lg">
            Manage inquiries, events, menus, recipes, and payments in one clean workspace.
            Professional, fast, and built for solo chefs and growing teams.
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
        <div className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
                Evaluation Ready
              </p>
              <h2 className="mt-2 text-2xl font-display tracking-tight text-stone-100 md:text-3xl">
                Compare ChefFlow before you switch.
              </h2>
              <p className="mt-2 max-w-2xl text-[0.95rem] leading-7 text-stone-300 md:text-base">
                See direct breakdowns against spreadsheets and generalized CRM stacks, plus quick
                answers to common implementation questions.
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
          <div className="mb-10 flex flex-col items-center justify-between gap-5 text-center md:flex-row md:text-left">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
                Early Outcomes
              </p>
              <h2 className="mt-2 fluid-display-lg font-display tracking-tight text-stone-100">
                Operators are seeing measurable gains.
              </h2>
              <p className="mt-3 max-w-2xl text-[0.95rem] leading-7 text-stone-300 md:text-base">
                These snapshots show what changed after replacing scattered tools with one operating
                flow.
              </p>
            </div>
            <TrackedLink
              href="/customers"
              analyticsName="home_proof_view_stories"
              analyticsProps={{ section: 'proof' }}
              className="inline-flex items-center rounded-lg border border-stone-600 bg-stone-900 px-5 py-2.5 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
            >
              View customer stories
            </TrackedLink>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {CUSTOMER_STORIES.map((story) => (
              <article
                key={story.slug}
                className="rounded-xl border border-stone-700 bg-stone-900 p-6 shadow-[var(--shadow-card)]"
              >
                <p className="text-xs text-muted-soft">
                  {story.chefName} - {story.location}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-stone-100">{story.title}</h3>
                <div className="mt-4 space-y-2">
                  {story.metrics.slice(0, 2).map((metric) => (
                    <div
                      key={metric.label}
                      className="flex items-center justify-between rounded-lg bg-stone-800 px-3 py-2"
                    >
                      <span className="text-xs text-muted-soft">{metric.label}</span>
                      <span className="text-sm font-semibold text-brand-300">{metric.delta}</span>
                    </div>
                  ))}
                </div>
                <TrackedLink
                  href={`/customers/${story.slug}`}
                  analyticsName="home_proof_story_open"
                  analyticsProps={{ story_slug: story.slug }}
                  className="mt-4 inline-flex text-sm font-semibold text-brand-400 hover:text-brand-300"
                >
                  Read full story
                </TrackedLink>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-y border-stone-700/50 bg-stone-900/40 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="fluid-display-lg font-display tracking-tight text-stone-100">
              From inquiry to payout in one flow.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[1.02rem] leading-8 text-stone-300">
              Keep the full client journey in one system with less back-and-forth.
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
            ? 'Ready to shape ChefFlow before public launch?'
            : 'Ready to run your business, not chase it.'}
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-[1.02rem] leading-8 text-stone-300">
          {isBeta
            ? "We're onboarding a small group of private chefs. Spots are limited."
            : '14-day free trial. No credit card required.'}
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
