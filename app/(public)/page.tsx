import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarDays, CreditCard, UsersRound } from 'lucide-react'
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
  title: 'ChefFlow | Private Chef Business Software — Ops for Artists',
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
      'Private chef software for events, clients, menus, and payments. 14-day free trial.',
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
      'Every inquiry, proposal, and event — organized in one place. No more juggling apps.',
  },
  {
    icon: UsersRound,
    title: 'Client Experience',
    description:
      'Clients review proposals, approve menus, and pay — all through a polished portal.',
  },
  {
    icon: CreditCard,
    title: 'Payments & Financials',
    description:
      'Invoicing, deposits, and expense tracking built in. Know your margins on every event.',
  },
]

export default function Home() {
  return (
    <div>
      {/* Structured data for Google rich results */}
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <SoftwareApplicationJsonLd />
      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[60px]" />
        <div className="pointer-events-none absolute -right-10 top-10 h-[250px] w-[250px] rounded-full bg-brand-800/25 blur-[50px]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-16 pt-20 text-center sm:px-6 md:pb-20 md:pt-24 lg:px-8">
          <h1 className="max-w-4xl text-4xl font-display tracking-tight text-stone-100 md:text-6xl">
            The business OS built by a chef, for chefs.
          </h1>
          <p className="mt-4 rounded-full border border-brand-700 bg-stone-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            Built by chefs for chefs
          </p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-stone-300 md:text-lg">
            Manage inquiries, events, menus, recipes, and payments in one clean workspace.
            Professional, fast, and built for solo chefs and growing teams.
          </p>
          <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Sign up
            </Link>
            <Link
              href="/pricing"
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-stone-600 bg-stone-900 px-6 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
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
                <p className="mt-2 text-sm leading-relaxed text-stone-300">{feature.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="relative border-y border-stone-700/50 bg-stone-900/40 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
              From inquiry to payout in one flow.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-stone-300">
              Keep the full client journey in one system with less back-and-forth.
            </p>
          </div>
          <WorkflowSteps />
        </div>
      </section>

      <MeetRemySection />

      <HowItWorksSection />

      {/* Beta CTA */}
      <section className="relative border-y border-stone-700/50 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-900/20 via-transparent to-brand-800/10" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <p className="rounded-full border border-brand-700 bg-stone-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300 mb-4">
              Closed Beta
            </p>
            <h2 className="text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
              Be one of the first.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-stone-300">
              We&apos;re onboarding a small group of private chefs to shape ChefFlow before public
              launch. Spots are limited.
            </p>
            <Link
              href="/beta"
              className="mt-8 inline-flex items-center justify-center rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Request early access
            </Link>
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-4 py-14 text-center sm:px-6 md:py-20 lg:px-8">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[200px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-800/20 blur-[50px]" />
        <h2 className="relative text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
          Ready to run your business, not chase it.
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-base leading-relaxed text-stone-300">
          14-day free trial. No credit card required.
        </p>
        <Link
          href="/auth/signup"
          className="relative mt-8 inline-flex items-center justify-center rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          Sign up
        </Link>
      </section>
    </div>
  )
}
