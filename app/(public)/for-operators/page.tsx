import type { Metadata } from 'next'
import Link from 'next/link'

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
      'Remy helps with break-even analysis, portion calculations, client communication drafts, and more. Secure cloud AI that never stores conversation content.',
  },
]

const PRINCIPLES = [
  { stat: 'Free', label: 'forever' },
  { stat: 'Self', label: 'hosted' },
  { stat: 'Zero', label: 'commission' },
  { stat: '100%', label: 'private' },
]

export default function ForOperatorsPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden hero-glow">
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-12 pt-24 text-center sm:px-6 md:pb-20 md:pt-32 lg:px-8">
          <p className="mb-6 rounded-full border border-brand-700/30 bg-brand-950/40 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-300">
            Ops for Artists
          </p>
          <h1 className="max-w-4xl fluid-display-xl font-display tracking-tight text-gradient">
            The operating system for food operators.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-stone-300 md:text-xl">
            Clients, events, menus, food costing, recipes, finances, and staff.
            <br className="hidden sm:inline" />
            One platform that respects your craft and your privacy.
          </p>

          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/auth/signup"
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

      {/* Principles */}
      <section className="border-t border-stone-800/40">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-4">
          {PRINCIPLES.map((p) => (
            <div key={p.stat} className="text-center">
              <div className="text-2xl font-display font-bold text-stone-100">{p.stat}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wider text-stone-500">
                {p.label}
              </div>
            </div>
          ))}
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

      {/* Capabilities */}
      <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <h2 className="text-center font-display text-3xl font-bold tracking-tight text-stone-100 md:text-4xl">
          Everything you need.
          <br />
          <span className="text-stone-500">Nothing you don&apos;t.</span>
        </h2>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-stone-800/60 sm:grid-cols-2">
          {CAPABILITIES.map((cap, i) => (
            <div
              key={cap.title}
              className="bg-stone-900/40 px-6 py-6 transition-colors hover:bg-stone-900/70 sm:py-8"
            >
              <div className="flex items-baseline gap-3">
                <span className="text-lg font-display font-bold text-brand-500">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-stone-100">{cap.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-stone-400">{cap.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof stat */}
      <section className="border-t border-stone-800/40 bg-stone-950/40">
        <div className="mx-auto w-full max-w-3xl px-4 py-14 text-center sm:px-6 md:py-20 lg:px-8">
          <p className="text-sm font-medium uppercase tracking-wider text-stone-500">
            Built by a chef who lived the problem
          </p>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-stone-300">
            10+ years of private chef work. Recipes in my head, receipts in shoeboxes, client info
            scattered across text threads and sticky notes. ChefFlow exists because I needed it
            first.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-stone-800/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6 md:py-28 lg:px-8">
          <h2 className="font-display text-3xl font-bold tracking-tight text-stone-100 md:text-4xl">
            Your craft deserves better tools.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-400">
            Stop juggling spreadsheets, texts, and sticky notes. ChefFlow brings your entire
            operation into one place so you can focus on cooking.
          </p>
          <Link
            href="/auth/signup"
            className="mt-10 inline-flex h-14 items-center justify-center rounded-2xl gradient-accent px-10 text-base font-semibold text-white glow-hover shadow-lg"
          >
            Start for Free
          </Link>
        </div>
      </section>
    </main>
  )
}
