import type { Metadata } from 'next'
import Link from 'next/link'
import {
  CHEF_PARTNER_AGREEMENT_SECTIONS,
  CHEF_PARTNER_AGREEMENT_VERSION,
} from '@/lib/chef-network/partner-terms'

export const metadata: Metadata = {
  title: 'Chef Partner Agreement | ChefFlow',
  description:
    'ChefFlow chef partner agreement covering booking attribution, commission, existing clients, direct rebooks, disputes, payments, and professional responsibility.',
}

export default function ChefPartnerTermsPage() {
  return (
    <main>
      <section className="border-b border-stone-800/50">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
            Chef Partner Agreement
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-stone-100 md:text-5xl">
            Booking partnership terms
          </h1>
          <p className="mt-5 text-sm leading-7 text-stone-300">
            Agreement version {CHEF_PARTNER_AGREEMENT_VERSION}. This page is the operational draft
            used to define the partner model. It does not enroll or bind a chef by itself. A binding
            relationship begins only when the chef-specific schedule and applicable terms are
            presented and accepted during onboarding.
          </p>
          <p className="mt-3 text-xs leading-6 text-stone-500">
            This draft should receive legal review before nationwide commercial rollout because
            contractor classification, tax, food-service, payment, and consumer rules can vary by
            jurisdiction.
          </p>
          <Link
            href="/chef-partners"
            className="mt-6 inline-flex text-sm font-semibold text-brand-300 hover:text-brand-200"
          >
            Back to partner economics
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {CHEF_PARTNER_AGREEMENT_SECTIONS.map((section) => (
            <article
              key={section.title}
              className="rounded-2xl border border-stone-800/70 bg-stone-900/45 p-6"
            >
              <h2 className="text-lg font-semibold text-stone-100">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-stone-300">{section.body}</p>
            </article>
          ))}
        </div>

        <section className="mt-10 rounded-3xl border border-stone-800/70 bg-stone-950/60 p-6 sm:p-8">
          <h2 className="font-display text-2xl font-bold text-stone-100">
            Chef-specific signed schedule
          </h2>
          <p className="mt-3 text-sm leading-7 text-stone-300">
            Before the chef accepts a commissionable booking, the signed schedule must identify the
            contracting chef or business, effective date, service territory, commission rate, payout
            method and timing, cancellation treatment, credentials required for service, and any
            negotiated exceptions.
          </p>
          <p className="mt-4 text-sm leading-7 text-stone-400">
            ChefFlow should preserve the exact accepted agreement version and rate on every booking
            attribution record so later edits to public terms cannot retroactively change an already
            accepted booking.
          </p>
        </section>
      </section>
    </main>
  )
}
