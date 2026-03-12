import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { CUSTOMER_STORIES } from '@/lib/marketing/customer-stories'
import { LAUNCH_MODE, PRIMARY_SIGNUP_HREF, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Customer Stories | ChefFlow',
  robots: { index: false, follow: false },
}

export default function CustomersPage() {
  // No customer stories published yet. Return 404 instead of showing
  // an empty placeholder page (Zero Hallucination rule).
  if (CUSTOMER_STORIES.length === 0) {
    notFound()
  }

  const isBeta = LAUNCH_MODE === 'beta'
  const customersStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'ChefFlow Customer Stories',
    url: `${BASE_URL}/customers`,
  }

  return (
    <div className="dark-surface bg-stone-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(customersStructuredData) }}
      />
      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[380px] w-[720px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[80px]" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6 md:py-24 lg:px-8">
          <p className="inline-flex rounded-full border border-brand-700 bg-stone-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            Customer Stories
          </p>
          <h1 className="mt-5 text-4xl font-display tracking-tight text-stone-100 md:text-6xl">
            Chef stories from real ChefFlow users.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-stone-300 md:text-lg">
            Every story here is verified and published with explicit customer approval. No generated
            names, fabricated outcomes, or synthetic testimonials.
          </p>
        </div>
      </section>

      {/* Story cards will render here when CUSTOMER_STORIES has entries */}

      <section className="border-y border-stone-700/50 bg-stone-900/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 text-center sm:px-6 md:py-20 lg:px-8">
          <h2 className="text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
            Ready to steady the work behind the service?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-300">
            {isBeta
              ? 'Join the closed beta and help shape the workflow with direct feedback.'
              : 'Start with a setup that keeps inquiries, menus, payments, and follow-up in one place.'}
          </p>
          <TrackedLink
            href={PRIMARY_SIGNUP_HREF}
            analyticsName="customers_bottom_primary_cta"
            analyticsProps={{ launch_mode: LAUNCH_MODE }}
            className="mt-8 inline-flex items-center rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {PRIMARY_SIGNUP_LABEL}
          </TrackedLink>
        </div>
      </section>
    </div>
  )
}
