import type { Metadata } from 'next'
import Link from 'next/link'
import { calculateChefNetworkCommission } from '@/lib/chef-network/attribution'
import {
  CHEF_PARTNER_PRINCIPLES,
  CHEF_PARTNER_SAMPLE_COMMISSION_BPS,
} from '@/lib/chef-network/partner-terms'

export const metadata: Metadata = {
  title: 'Chef Partner Network | ChefFlow',
  description:
    'Invitation-based private-chef booking partnerships: no subscription, no exclusivity, existing-client protection, and commission only on qualifying ChefFlow-originated bookings.',
}

const EXAMPLES = [100000, 200000, 300000].map((serviceSubtotalCents) => ({
  serviceSubtotalCents,
  ...calculateChefNetworkCommission({
    serviceSubtotalCents,
    commissionRateBps: CHEF_PARTNER_SAMPLE_COMMISSION_BPS,
  }),
}))

const FAQ = [
  {
    question: 'Why would I give another company a percentage of my dinner?',
    answer:
      'You do not pay ChefFlow for business you already own. The commission applies only to a qualifying booking ChefFlow originated and processed under your active agreement.',
  },
  {
    question: 'Are my existing clients supposed to start booking through ChefFlow?',
    answer:
      'No. Existing clients remain yours. The attribution system is specifically designed to keep chef-owned demand out of the commission pool.',
  },
  {
    question: 'What if a ChefFlow client calls me directly six months later?',
    answer:
      'The original introduction does not create a perpetual commission tail. A later direct booking outside ChefFlow is not commissionable merely because the original dinner came through ChefFlow.',
  },
  {
    question: 'Can ChefFlow discount me or accept work for me?',
    answer:
      'No. You control your price, service area, availability, menu, and acceptance. A booking is not yours until you accept it.',
  },
  {
    question: 'What if we disagree about who sourced the client?',
    answer:
      'The commission freezes. Timestamped first-touch evidence is reviewed and the attribution record keeps the decision reason and audit history.',
  },
  {
    question: 'Am I guaranteed bookings?',
    answer:
      'No. The network is an added booking channel, not guaranteed income. You pay no booking commission when there is no qualifying completed booking.',
  },
] as const

function money(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export default function ChefPartnersPage() {
  const exampleRate = CHEF_PARTNER_SAMPLE_COMMISSION_BPS / 100

  return (
    <main>
      <section className="border-b border-stone-800/50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
            Invitation-based pilot
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold tracking-tight text-stone-100 md:text-6xl">
            More private dinners without giving up the business you already built.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-stone-300">
            ChefFlow sources and qualifies incremental private-chef demand. You decide whether the
            job fits. Your existing clients stay yours, and ChefFlow only earns an agreed commission
            when a qualifying ChefFlow-originated booking closes through the platform.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/chef-partners/terms"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Review partner agreement
            </Link>
            <a
              href="#economics"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-stone-700 bg-stone-900/60 px-5 text-sm font-semibold text-stone-100 hover:bg-stone-800"
            >
              See the economics
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
            The deal
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-stone-100 md:text-4xl">
            The network is additive, not a claim on your book of business.
          </h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CHEF_PARTNER_PRINCIPLES.map((principle) => (
            <article
              key={principle}
              className="rounded-2xl border border-stone-800/70 bg-stone-900/45 p-5 text-sm leading-7 text-stone-300"
            >
              {principle}
            </article>
          ))}
        </div>
      </section>

      <section id="economics" className="border-y border-stone-800/50 bg-stone-950/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
            Economics
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-stone-100 md:text-4xl">
            No lead fee. No monthly fee. Commission only after a qualifying booking.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-400">
            These are illustrations at a {exampleRate}% sample commission rate, not a universal
            rate. The actual rate is fixed in the chef-specific signed schedule before a booking is
            accepted. Tax, gratuity, refunded service amounts, and separately itemized pass-through
            reimbursements are excluded from the standard commission basis.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {EXAMPLES.map((example) => (
              <article
                key={example.serviceSubtotalCents}
                className="rounded-2xl border border-stone-800/70 bg-stone-900/50 p-6"
              >
                <p className="text-sm text-stone-400">Service subtotal</p>
                <p className="mt-1 text-3xl font-bold text-stone-100">
                  {money(example.serviceSubtotalCents)}
                </p>
                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-stone-400">Sample ChefFlow commission</dt>
                    <dd className="font-medium text-stone-200">
                      {money(example.commissionAmountCents)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-stone-800 pt-3">
                    <dt className="text-stone-300">Chef service revenue after commission</dt>
                    <dd className="font-semibold text-stone-100">
                      {money(example.chefServiceRevenueAfterCommissionCents)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
              What ChefFlow does
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-stone-100">
              The commission has to pay for a real sales and booking operation.
            </h2>
            <ol className="mt-6 space-y-4">
              {[
                'Acquire private-chef demand outside the chef existing client base.',
                'Qualify date, location, guest count, budget, service needs, and dietary context.',
                'Match the opportunity to a chef whose territory and service fit the request.',
                'Let the chef review the economics and accept or decline before commitment.',
                'Keep booking, payment, logistics, support, and attribution attached to one record.',
                'Reconcile refunds and commission from the locked booking snapshot.',
              ].map((item, index) => (
                <li
                  key={item}
                  className="flex gap-4 rounded-2xl border border-stone-800/70 bg-stone-900/40 p-5"
                >
                  <span className="text-sm font-bold text-brand-300">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm leading-7 text-stone-300">{item}</span>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
              Attribution firewall
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-stone-100">
              The source record decides whether commission exists.
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-stone-300">
              <p className="rounded-2xl border border-stone-800/70 bg-stone-900/40 p-5">
                Chef already knew the client before ChefFlow:{' '}
                <strong>no booking commission.</strong>
              </p>
              <p className="rounded-2xl border border-stone-800/70 bg-stone-900/40 p-5">
                ChefFlow generated the client and the booking closes through ChefFlow:{' '}
                <strong>commission applies at the signed rate.</strong>
              </p>
              <p className="rounded-2xl border border-stone-800/70 bg-stone-900/40 p-5">
                Client later books the chef directly outside ChefFlow:{' '}
                <strong>no perpetual commission tail.</strong>
              </p>
              <p className="rounded-2xl border border-stone-800/70 bg-stone-900/40 p-5">
                Source is unclear or disputed: <strong>commission freezes for review.</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-800/50 bg-stone-950/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
            Questions chefs should ask
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl font-bold text-stone-100 md:text-4xl">
            The model should survive scrutiny before anyone accepts a dinner.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {FAQ.map((item) => (
              <article
                key={item.question}
                className="rounded-2xl border border-stone-800/70 bg-stone-900/45 p-6"
              >
                <h3 className="font-semibold text-stone-100">{item.question}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-400">{item.answer}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 rounded-3xl border border-brand-700/30 bg-brand-950/20 p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold text-stone-100">
              Read the rules before discussing a booking.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300">
              The partner agreement defines ownership, attribution, commission basis, direct
              rebooks, disputes, professional obligations, and termination before money is at stake.
            </p>
            <Link
              href="/chef-partners/terms"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Review the agreement
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
