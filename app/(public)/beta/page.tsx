import type { Metadata } from 'next'
import { BetaSignupForm } from '@/components/beta/beta-signup-form'
import { getBetaSignupCount } from '@/lib/beta/actions'
import { BETA_CAPACITY } from '@/lib/beta/constants'

export const metadata: Metadata = {
  title: 'Join the Beta | ChefFlow',
  description:
    'Sign up for early access to ChefFlow — the business operating system built by a chef, for chefs. Limited spots available.',
  openGraph: {
    title: 'Join the ChefFlow Beta',
    description: 'Early access to the private chef business OS. Limited spots.',
    url: 'https://cheflowhq.com/beta',
    siteName: 'ChefFlow',
  },
}

export default async function BetaSignupPage() {
  const signupCount = await getBetaSignupCount()

  return (
    <section className="relative mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <div className="text-center mb-10">
        <p className="rounded-full inline-block border border-brand-700 bg-stone-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300 mb-4">
          Closed Beta
        </p>
        <h1 className="text-4xl font-display tracking-tight text-stone-100 md:text-5xl">
          Join the inner circle.
        </h1>
        <p className="mt-4 max-w-lg mx-auto text-base leading-relaxed text-stone-300 md:text-lg">
          We&apos;re building ChefFlow with a small group of private chefs who want their business
          to run as well as their kitchen. Spots are limited.
        </p>
        {signupCount > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-brand-400 font-medium">
              {signupCount} of {BETA_CAPACITY} spots filled
            </p>
            <div className="mx-auto max-w-xs h-2 rounded-full bg-stone-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
                style={{ width: `${Math.min((signupCount / BETA_CAPACITY) * 100, 100)}%` }}
              />
            </div>
            {signupCount >= BETA_CAPACITY * 0.8 && signupCount < BETA_CAPACITY && (
              <p className="text-xs text-amber-400">
                Only {BETA_CAPACITY - signupCount} spots remaining
              </p>
            )}
            {signupCount >= BETA_CAPACITY && (
              <p className="text-xs text-red-400">Waitlist only — all spots are filled</p>
            )}
          </div>
        )}
      </div>

      <div className="relative rounded-xl border border-stone-700 bg-stone-900/80 backdrop-blur-sm p-6 md:p-8 shadow-[var(--shadow-card)]">
        <BetaSignupForm />
      </div>

      <div className="mt-8 text-center space-y-2">
        <p className="text-sm text-stone-500">
          No credit card required. We&apos;ll reach out when your spot is ready.
        </p>
        <p className="text-xs text-stone-600">
          Your information is never shared. Read our{' '}
          <a href="/privacy" className="text-brand-500 hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </section>
  )
}
