import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Welcome to the Beta | ChefFlow',
  description: "You're in. Here's what to expect from the ChefFlow closed beta.",
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
          Welcome to the inner circle.
        </h1>
        <p className="mt-4 max-w-lg mx-auto text-base leading-relaxed text-stone-300 md:text-lg">
          Your spot is reserved. We&apos;ll be in touch soon.
        </p>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-stone-700 bg-stone-900/80 backdrop-blur-sm p-6 md:p-8 space-y-8">
        {/* What is the closed beta? */}
        <div>
          <h2 className="text-lg font-semibold text-stone-100 mb-2">What is the closed beta?</h2>
          <p className="text-sm leading-relaxed text-stone-300">
            ChefFlow is being built alongside a small group of working private chefs. You&apos;ll
            get early access to the platform before it opens to the public, and your feedback will
            directly shape how it works. This isn&apos;t a mass rollout — it&apos;s a conversation.
          </p>
        </div>

        {/* What to expect */}
        <div>
          <h2 className="text-lg font-semibold text-stone-100 mb-3">What to expect</h2>
          <ul className="space-y-3 text-sm text-stone-300">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-brand-950 text-brand-400 text-xs font-bold mt-0.5">
                1
              </span>
              <span>
                <strong className="text-stone-200">An invitation email</strong> — when your access
                is ready, we&apos;ll send you a personal link to create your account.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-brand-950 text-brand-400 text-xs font-bold mt-0.5">
                2
              </span>
              <span>
                <strong className="text-stone-200">Full platform access</strong> — events, clients,
                menus, recipes, quotes, payments, scheduling — the whole system.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-brand-950 text-brand-400 text-xs font-bold mt-0.5">
                3
              </span>
              <span>
                <strong className="text-stone-200">A direct line to us</strong> — beta testers get
                priority support and a voice in what gets built next.
              </span>
            </li>
          </ul>
        </div>

        {/* Honest notes */}
        <div>
          <h2 className="text-lg font-semibold text-stone-100 mb-3">A few honest notes</h2>
          <ul className="space-y-2 text-sm text-stone-400">
            <li className="flex items-start gap-2">
              <span className="text-brand-500 mt-0.5 flex-shrink-0">&bull;</span>
              <span>
                Things may occasionally break — you&apos;re seeing the product before it&apos;s
                polished.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-500 mt-0.5 flex-shrink-0">&bull;</span>
              <span>
                Your feedback is genuinely valuable. We read everything and build accordingly.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-500 mt-0.5 flex-shrink-0">&bull;</span>
              <span>
                The beta is free. When we launch, beta testers get special pricing as a thank you.
              </span>
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
