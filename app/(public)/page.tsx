// Public landing page
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'ChefFlow - Private Chef & Catering Platform' }
import { Card, CardContent } from '@/components/ui/card'

export default function Home() {
  return (
    <main>
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-stone-900 mb-6">
            Your Private Chef Business,{' '}
            <span className="text-brand-600">Simplified</span>
          </h1>
          <p className="text-lg md:text-xl text-stone-600 mb-8 max-w-2xl mx-auto">
            Manage events, clients, and payments in one place
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto bg-brand-600 text-white px-8 py-3 rounded-md hover:bg-brand-700 transition-colors font-medium text-center"
            >
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto bg-white text-stone-700 px-8 py-3 rounded-md hover:bg-stone-50 transition-colors font-medium border border-stone-300 text-center"
            >
              See Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-stone-50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-4">
              Everything you need to run your chef business
            </h2>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              Streamline your workflow with tools built specifically for private chefs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <Card className="rounded-xl hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-stone-900 mb-2">
                  Event Management
                </h3>
                <p className="text-stone-600">
                  Track events from proposal to completion with a clear workflow and status tracking
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="rounded-xl hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-stone-900 mb-2">
                  Client Portal
                </h3>
                <p className="text-stone-600">
                  Let clients accept proposals and pay online with a professional, branded experience
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="rounded-xl hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-stone-900 mb-2">
                  Financial Tracking
                </h3>
                <p className="text-stone-600">
                  Ledger-first accounting you can trust with automatic payment processing via Stripe
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-4">
              How it works
            </h2>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              Three simple steps to get paid for your private chef services
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-brand-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="text-xl font-semibold text-stone-900 mb-2">
                  Create Event
                </h3>
                <p className="text-stone-600">
                  Add event details, menu, and pricing in minutes
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-brand-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="text-xl font-semibold text-stone-900 mb-2">
                  Send to Client
                </h3>
                <p className="text-stone-600">
                  Client receives proposal and can pay securely online
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-brand-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="text-xl font-semibold text-stone-900 mb-2">
                  Get Paid
                </h3>
                <p className="text-stone-600">
                  Automatic payment processing with Stripe integration
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser Section */}
      <section className="bg-stone-50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-stone-600 mb-8">
              One straightforward plan with everything you need. No hidden fees.
            </p>
            <Link
              href="/pricing"
              className="inline-block bg-brand-600 text-white px-8 py-3 rounded-md hover:bg-brand-700 transition-colors font-medium"
            >
              See Plans
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
