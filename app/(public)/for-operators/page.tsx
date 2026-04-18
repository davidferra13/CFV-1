import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMarketingSignupHref } from '@/lib/marketing/signup-links'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'For Operators - Run Your Food Business on ChefFlow',
  description:
    'The operating system for private chefs, caterers, and food operators. Manage clients, events, menus, food costing, finances, staff, and your entire business from one place. Free forever.',
  openGraph: {
    title: 'For Operators - ChefFlow',
    description:
      'The operating system for private chefs, caterers, and food operators. Manage clients, events, menus, food costing, finances, staff, and your entire business from one place.',
    url: `${BASE_URL}/for-operators`,
    siteName: 'ChefFlow',
    type: 'website',
  },
  alternates: {
    canonical: `${BASE_URL}/for-operators`,
  },
}

const PAIN_POINTS = [
  {
    problem: '60% of your week is not cooking.',
    detail:
      'Shopping, driving, texting clients, invoicing, bookkeeping, social media. Most operators price for cooking hours and lose money on everything else.',
    solution: 'ChefFlow handles the admin so you can price for the full job.',
  },
  {
    problem: 'You do not know your real food cost.',
    detail:
      'Without yield factors, Q-factor, and post-event reconciliation, you are guessing. A 2% variance on $300K annual revenue is $6,000 in lost profit.',
    solution:
      'ChefFlow costs recipes with yield, Q-factor, and 10-tier price resolution. Then tracks actual vs. theoretical after every event.',
  },
  {
    problem: 'Your clients are worth more than one event.',
    detail:
      'A single satisfied client is worth $10,000 to $25,000 over 3 years through repeat bookings, meal prep conversion, and referrals. Most operators never track this.',
    solution:
      'ChefFlow tracks client lifetime value, repeat rate, and engagement. Turn one dinner into recurring revenue.',
  },
  {
    problem: 'January will be quiet. You already know it.',
    detail:
      'May through December is 60%+ of annual revenue. Without a plan for slow months, cash flow breaks.',
    solution:
      'ChefFlow manages multiple service types (events, meal prep, classes) in one pipeline so you can diversify and smooth revenue year-round.',
  },
]

const CAPABILITIES = [
  {
    title: 'Clients',
    detail:
      'Dietary needs, allergies, preferences, communication history, lifetime value, and engagement tracking. Every client is a relationship, not a transaction.',
  },
  {
    title: 'Events',
    detail:
      'Inquiry to post-service in 8 stages: timelines, prep lists, packing checklists, staff coordination, and post-event reconciliation.',
  },
  {
    title: 'Menus & Food Costing',
    detail:
      'Build menus, cost every recipe with yield factors and Q-factor, track blended food cost percentage, and generate client proposals with real numbers.',
  },
  {
    title: 'Finances',
    detail:
      'Immutable ledger, invoicing, payments, expenses, mileage, tax-ready reports. Actual vs. theoretical cost tracking after every event.',
  },
  {
    title: 'Recipes',
    detail:
      'Your recipe book digitized. Scale portions, cost per serving, track cross-utilization across menus, and protect your intellectual property.',
  },
  {
    title: 'Inventory & Vendors',
    detail:
      'Track stock, manage vendor relationships, compare prices across suppliers, and auto-generate shopping lists from your menus.',
  },
  {
    title: 'Staff',
    detail:
      'Roster, task assignment, hours tracking, performance, and payroll. Manage 1099 contractors for events or permanent hires.',
  },
  {
    title: 'AI Assistant',
    detail:
      'Remy helps with break-even analysis, portion calculations, client communication drafts, and more. Private AI that never stores conversation content.',
  },
]

export default function ForOperatorsPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden hero-glow">
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-12 pt-24 text-center sm:px-6 md:pb-20 md:pt-32 lg:px-8">
          <h1 className="max-w-4xl fluid-display-xl font-display tracking-tight text-gradient">
            You are a great cook running on guesswork.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-stone-300 md:text-xl">
            ChefFlow is the back office you never had. Clients, events, menus, food costing with
            real yield factors, finances, recipes, inventory, staff. One place, free, private.
          </p>

          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href={buildMarketingSignupHref({
                sourcePage: 'for_operators',
                sourceCta: 'hero_operator_signup',
              })}
              className="inline-flex h-14 items-center justify-center rounded-2xl gradient-accent px-10 text-base font-semibold text-white glow-hover shadow-lg"
            >
              Get Started Free
            </Link>
            <Link
              href="/auth/signin"
              className="inline-flex h-14 items-center justify-center rounded-2xl border border-stone-700 bg-stone-900/60 px-8 text-base font-medium text-stone-300 transition-all hover:bg-stone-800 hover:border-stone-600 hover:text-stone-100"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Pain points */}
      <section className="border-t border-stone-800/40 bg-stone-950/40">
        <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight text-stone-100 md:text-4xl">
            The problems nobody talks about.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-stone-400">
            Most food operators are excellent cooks running on guesswork. These are the invisible
            problems that eat your margin.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {PAIN_POINTS.map((point) => (
              <div
                key={point.problem}
                className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-6 transition-colors hover:bg-stone-900/70"
              >
                <h3 className="text-base font-semibold text-stone-100">{point.problem}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-400">{point.detail}</p>
                <p className="mt-3 text-sm font-medium text-brand-400">{point.solution}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What is in the box */}
      <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <h2 className="font-display text-2xl font-bold tracking-tight text-stone-100 md:text-3xl">
          What you get
        </h2>
        <p className="mt-3 text-sm text-stone-400">
          Everything below is included in the free tier. No transaction fees, no locked core
          workflows.
        </p>
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-stone-800/60 sm:grid-cols-2">
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.title}
              className="bg-stone-900/40 px-6 py-6 transition-colors hover:bg-stone-900/70 sm:py-8"
            >
              <h3 className="text-base font-semibold text-stone-100">{cap.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-stone-400">{cap.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* See it in action - feature proof */}
      <section className="border-t border-stone-800/40 bg-stone-950/40">
        <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <h2 className="font-display text-2xl font-bold tracking-tight text-stone-100 md:text-3xl">
            See it in action
          </h2>
          <p className="mt-3 text-sm text-stone-400">
            This is not a concept or a waitlist. ChefFlow is live and operators are using it today.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-950/60 border border-brand-800/30 mb-4">
                <svg
                  className="h-5 w-5 text-brand-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-stone-200">Dashboard</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
                Revenue, upcoming events, pipeline status, recent activity. Everything you need at a
                glance when you open the app.
              </p>
            </div>
            <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-950/60 border border-brand-800/30 mb-4">
                <svg
                  className="h-5 w-5 text-brand-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-stone-200">Menu costing</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
                Build menus from your recipe book. See per-plate food cost with yield factors and
                Q-factor. Know your margin before you quote.
              </p>
            </div>
            <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-950/60 border border-brand-800/30 mb-4">
                <svg
                  className="h-5 w-5 text-brand-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-stone-200">Event lifecycle</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
                8 stages from inquiry to post-event. Prep lists, packing checklists, staff
                coordination, and post-event reconciliation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How is this free? */}
      <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold tracking-tight text-stone-100 md:text-2xl">
            How is this free?
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-stone-400">
            Most platforms take 15-20% of every transaction. A chef earning $5,000 on an event loses
            $750-$1,000 to the platform before paying for groceries, staff, or gas.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-stone-400">
            ChefFlow is funded by voluntary supporter contributions from operators who find value in
            the platform. There is no paywall, no commission, and no feature locked behind a
            subscription. Every capability listed above is available the moment you sign up.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-stone-400">
            If ChefFlow saves you time and helps you run a better business, you can choose to
            support the project in settings. That is the entire business model.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-stone-800/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center sm:px-6 md:py-20 lg:px-8">
          <p className="max-w-xl text-base leading-relaxed text-stone-300">
            If you are tired of running your business across 6 different apps, spreadsheets, and
            text threads, this is the one place that replaces all of them.
          </p>
          <Link
            href={buildMarketingSignupHref({
              sourcePage: 'for_operators',
              sourceCta: 'final_operator_signup',
            })}
            className="mt-8 inline-flex h-14 items-center justify-center rounded-2xl gradient-accent px-10 text-base font-semibold text-white glow-hover shadow-lg"
          >
            Start for Free
          </Link>
        </div>
      </section>
    </main>
  )
}
