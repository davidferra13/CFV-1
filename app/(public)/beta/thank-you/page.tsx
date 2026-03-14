import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Welcome to the Beta | ChefFlow',
  description: "You're in. Here's what to expect from the ChefFlow beta.",
}

export default function BetaThankYouPage() {
  return (
    <section className="relative mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-950 mb-6">
          <CheckCircle2 className="w-8 h-8 text-brand-400" />
        </div>
        <h1 className="text-4xl font-display tracking-tight text-stone-100 md:text-5xl">
          You&apos;re in.
        </h1>
        <p className="mt-4 max-w-lg mx-auto text-base leading-relaxed text-stone-300 md:text-lg">
          Your beta spot is reserved. We&apos;ll be in touch soon.
        </p>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-stone-700 bg-stone-900/80 backdrop-blur-sm p-6 md:p-8 space-y-8">
        <div>
          <h2 className="text-lg font-semibold text-stone-100 mb-2">What this means</h2>
          <p className="text-sm leading-relaxed text-stone-300">
            You get early access before public launch and direct input into product decisions.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-stone-100 mb-3">What to expect</h2>
          <ul className="space-y-3 text-sm text-stone-300">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-brand-950 text-brand-400 text-xs font-bold mt-0.5">
                1
              </span>
              <span>
                <strong className="text-stone-200">Invitation email</strong> - we&apos;ll send your
                account setup link when access is ready.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-brand-950 text-brand-400 text-xs font-bold mt-0.5">
                2
              </span>
              <span>
                <strong className="text-stone-200">Full platform access</strong> - events, clients,
                menus, quotes, payments, and scheduling.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-brand-950 text-brand-400 text-xs font-bold mt-0.5">
                3
              </span>
              <span>
                <strong className="text-stone-200">Direct support</strong> - beta users get priority
                help and a voice in what ships next.
              </span>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-stone-100 mb-3">Notes</h2>
          <ul className="space-y-2 text-sm text-stone-400">
            <li className="flex items-start gap-2">
              <span className="text-brand-500 mt-0.5 flex-shrink-0">&bull;</span>
              <span>You may encounter rough edges while we iterate.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-500 mt-0.5 flex-shrink-0">&bull;</span>
              <span>We review all feedback and use it to prioritize work.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-500 mt-0.5 flex-shrink-0">&bull;</span>
              <span>The beta is free. Early users get launch pricing consideration.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Back link */}
      <div className="mt-8 text-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-stone-600 bg-stone-900 px-6 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
        >
          Back to ChefFlow
        </Link>
      </div>
    </section>
  )
}
