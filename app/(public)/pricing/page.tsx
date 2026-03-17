import type { Metadata } from 'next'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PRO_PRICE_MONTHLY, PRO_TRIAL_DAYS } from '@/lib/billing/constants'
import { LAUNCH_MODE, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'
import { buildMarketingSignupHref } from '@/lib/marketing/signup-links'

export const revalidate = 3600 // ISR: revalidate every hour
const IS_PUBLIC_LAUNCH = LAUNCH_MODE === 'public'

export const metadata: Metadata = {
  title: 'Pricing | ChefFlow',
  description: IS_PUBLIC_LAUNCH
    ? 'Simple pricing for private chefs. No hidden fees. Cancel anytime.'
    : 'ChefFlow is in invite-only beta. Request early access and we will onboard you directly.',
}

const PricingFaq = dynamic(() => import('./_components/pricing-faq'), {
  ssr: false,
  loading: () => (
    <section className="bg-stone-50 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="h-8 w-64 mx-auto bg-stone-200 rounded animate-pulse mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-white rounded-lg border border-stone-200 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  ),
})

// Pre-computed static feature list (no per-render computation)
const FEATURES = [
  'Unlimited events',
  'Unlimited clients',
  'Client portal access',
  'Stripe payment processing',
  'Financial reporting',
  'Email support',
  'Menu management',
  'Client communication tools',
] as const

const CheckIcon = () => (
  <svg
    className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
      clipRule="evenodd"
    />
  </svg>
)

export default function PricingPage() {
  return (
    <main>
      {/* Page Header */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4">Simple Pricing</h1>
          <p className="text-lg md:text-xl text-stone-600">
            {IS_PUBLIC_LAUNCH
              ? 'No hidden fees. Cancel anytime.'
              : 'Invite-only beta with direct onboarding for early operators.'}
          </p>
        </div>
      </section>

      {/* Pricing Card */}
      <section className="container mx-auto px-4 pb-16 md:pb-24">
        <div className="max-w-md mx-auto">
          <Card className="border-2 border-brand-500 shadow-xl">
            <CardHeader className="text-center pb-8 pt-8">
              <div className="mb-4">
                <span className="inline-block px-4 py-1 bg-brand-100 text-brand-700 text-sm font-semibold rounded-full">
                  MOST POPULAR
                </span>
              </div>
              <CardTitle className="text-2xl mb-4">Professional Chef</CardTitle>
              <div className="mb-2">
                {IS_PUBLIC_LAUNCH ? (
                  <>
                    <span className="text-5xl font-bold text-stone-900">${PRO_PRICE_MONTHLY}</span>
                    <span className="text-stone-600 text-lg">/month</span>
                  </>
                ) : (
                  <span className="text-5xl font-bold text-stone-900">Beta</span>
                )}
              </div>
              <p className="text-sm text-stone-600">
                {IS_PUBLIC_LAUNCH
                  ? `${PRO_TRIAL_DAYS}-day free trial included`
                  : 'Founding operators are onboarded directly while pricing is finalized.'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 mb-8">
                {FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <CheckIcon />
                    <span className="text-stone-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={buildMarketingSignupHref({
                  sourcePage: 'pricing',
                  sourceCta: 'pricing_card_primary',
                })}
                className="block w-full bg-brand-500 text-white text-center px-8 py-3 rounded-md hover:bg-brand-600 transition-colors font-medium"
              >
                {PRIMARY_SIGNUP_LABEL}
              </Link>
              <p className="text-xs text-stone-500 text-center">
                {IS_PUBLIC_LAUNCH
                  ? 'No credit card required for trial'
                  : 'We will follow up personally to confirm beta fit and onboarding.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ - lazy loaded (below the fold, client interactive) */}
      <Suspense>
        <PricingFaq />
      </Suspense>

      {/* Bottom CTA */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-stone-900 mb-4">
              Ready to streamline your chef business?
            </h2>
            <p className="text-lg text-stone-600 mb-8">
              Join professional chefs who trust ChefFlow to manage their business
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={buildMarketingSignupHref({
                  sourcePage: 'pricing',
                  sourceCta: 'bottom_primary',
                })}
                className="w-full sm:w-auto bg-brand-500 text-white px-8 py-3 rounded-md hover:bg-brand-600 transition-colors font-medium text-center"
              >
                {PRIMARY_SIGNUP_LABEL}
              </Link>
              <Link
                href="/contact"
                className="w-full sm:w-auto bg-white text-stone-700 px-8 py-3 rounded-md hover:bg-stone-50 transition-colors font-medium border border-stone-300 text-center"
              >
                {IS_PUBLIC_LAUNCH ? 'Contact Us' : 'Talk to us'}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
