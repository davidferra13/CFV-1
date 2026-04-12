import type { Metadata } from 'next'
import { BookDinnerForm } from './_components/book-dinner-form'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Book a Private Chef',
  description:
    'Tell us about your event and ChefFlow will share your request with matched private chefs in your area. Matched chefs reach out directly. Free to submit, no obligation.',
  openGraph: {
    title: 'Book a Private Chef',
    description:
      'Describe your event and get matched with reviewed private chefs near you. Matched chefs reach out directly.',
    url: `${BASE_URL}/book`,
    type: 'website',
  },
  alternates: {
    canonical: `${BASE_URL}/book`,
  },
}

export default function BookPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-600/8 via-transparent to-transparent" />
        <div className="relative z-10 mx-auto max-w-3xl px-4 pt-16 pb-8 text-center sm:px-6 md:pt-24 lg:px-8">
          <h1 className="text-3xl font-display tracking-tight text-white md:text-4xl lg:text-5xl">
            Book a private chef
          </h1>
          <p className="mt-4 text-base text-stone-300 md:text-lg leading-relaxed max-w-xl mx-auto">
            Tell us about your event. ChefFlow shares your request only with matched chefs in your
            area, and matched chefs reach out to you directly. Free to submit, no obligation.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="mx-auto max-w-2xl px-4 pb-20 sm:px-6 lg:px-8">
        <BookDinnerForm />
        <PublicSecondaryEntryCluster
          links={PUBLIC_SECONDARY_ENTRY_CONFIG.open_booking}
          theme="dark"
        />
      </section>

      {/* Trust footer */}
      <section className="border-t border-stone-800/40">
        <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-stone-400">
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Free to submit
            </span>
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              No obligation
            </span>
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Chefs contact you directly
            </span>
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Zero commission
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
