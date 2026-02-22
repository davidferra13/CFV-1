import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, CalendarDays, CreditCard, UsersRound } from 'lucide-react'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://chefflow.app'

export const metadata: Metadata = {
  title: 'ChefFlow | Private Chef Business OS',
  description: 'Events, clients, menus, and payments — finally in one calm workspace.',
  openGraph: {
    title: 'ChefFlow | Private Chef Business OS',
    description: 'Events, clients, menus, and payments — finally in one calm workspace.',
    url: BASE_URL,
    siteName: 'ChefFlow',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChefFlow | Private Chef Business OS',
    description: 'Events, clients, menus, and payments — finally in one calm workspace.',
  },
}

const FEATURES = [
  {
    icon: CalendarDays,
    title: 'Event Ops In One View',
    description: 'Track inquiries, proposals, prep, and service without switching tools.',
  },
  {
    icon: UsersRound,
    title: 'Client Collaboration',
    description: 'Clients can review proposals, confirm details, and respond faster.',
  },
  {
    icon: CreditCard,
    title: 'Built-In Payments',
    description: 'Send invoices and collect payments with Stripe-backed workflows.',
  },
]

const STEPS = [
  'Create an event and structure your menu + pricing.',
  'Send the proposal link to your client in seconds.',
  'Collect payment and move straight into service prep.',
]

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-stone-200 bg-gradient-to-b from-brand-50 via-surface-accent to-white">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[460px] w-[760px] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-16 pt-20 text-center sm:px-6 md:pb-20 md:pt-24 lg:px-8">
          <h1 className="max-w-4xl text-4xl font-display tracking-tight text-stone-900 md:text-6xl">
            Run your private chef business from one place.
          </h1>
          <p className="mt-4 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
            Private Chef Operating System
          </p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-stone-600 md:text-lg">
            Events, clients, menus, and payments — finally in one calm workspace.
          </p>
          <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Start for free
            </Link>
            <Link
              href="/pricing"
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <article
                key={feature.title}
                className="rounded-xl border border-stone-200 bg-white p-6 shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5"
              >
                <div className="mb-4 inline-flex rounded-lg bg-brand-50 p-2.5 text-brand-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-semibold text-stone-900">{feature.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{feature.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="border-y border-stone-200 bg-surface-muted">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20 lg:px-8">
          <div>
            <h2 className="text-3xl font-display tracking-tight text-stone-900 md:text-4xl">
              From inquiry to payout in one flow.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-stone-600">
              Keep the full client lifecycle in one system, with less back-and-forth and no
              fragmented spreadsheets.
            </p>
          </div>
          <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-[var(--shadow-card)]">
            {STEPS.map((step) => (
              <div key={step} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                <p className="text-sm leading-relaxed text-stone-700">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 text-center sm:px-6 md:py-20 lg:px-8">
        <h2 className="text-3xl font-display tracking-tight text-stone-900 md:text-4xl">
          Your calmer workflow starts here.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-stone-600">
          Start with the essentials, then scale your operations with confidence.
        </p>
        <Link
          href="/auth/signup"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          Get started free
        </Link>
      </section>
    </main>
  )
}
