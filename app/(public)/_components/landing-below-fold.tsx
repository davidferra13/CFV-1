import Link from 'next/link'
import { CheckCircle2, CalendarDays, CreditCard, UsersRound } from 'lucide-react'
import { LAUNCH_MODE, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'
import { buildMarketingSignupHref } from '@/lib/marketing/signup-links'

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
] as const

const STEPS = [
  'Create an event and structure your menu + pricing.',
  'Send the proposal link to your client in seconds.',
  'Collect payment and move straight into service prep.',
] as const

const IS_BETA = LAUNCH_MODE === 'beta'

export default function LandingBelowFold() {
  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <article
                key={feature.title}
                className="rounded-xl border border-stone-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
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

      <section className="border-y border-stone-200 bg-stone-50/70">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20 lg:px-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-stone-900 md:text-4xl">
              From inquiry to payout in one flow.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-stone-600">
              Keep the full client lifecycle in one system, with less back-and-forth and no
              fragmented spreadsheets.
            </p>
          </div>
          <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-6">
            {STEPS.map((step) => (
              <div key={step} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                <p className="text-sm leading-relaxed text-stone-700">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 text-center sm:px-6 md:py-20 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-stone-900 md:text-4xl">
          Ready for a calmer workflow?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-stone-600">
          Start with the essentials, then scale your operations with confidence.
        </p>
        <Link
          href={buildMarketingSignupHref({
            sourcePage: 'home',
            sourceCta: 'below_fold_primary',
          })}
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          {IS_BETA ? PRIMARY_SIGNUP_LABEL : 'Create Your Account'}
        </Link>
      </section>
    </>
  )
}
