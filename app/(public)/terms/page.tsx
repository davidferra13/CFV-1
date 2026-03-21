import type { Metadata } from 'next'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Terms of Service | ChefFlow',
  description: 'Read the terms and conditions governing your use of the ChefFlow platform.',
}

const TermsExtendedSections = dynamic(() => import('./_components/terms-extended-sections'), {
  loading: () => (
    <div className="space-y-10">
      {[1, 2, 3, 4].map((i) => (
        <div key={i}>
          <div className="h-6 w-48 loading-bone loading-bone-light mb-4" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-stone-100 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-stone-100 rounded animate-pulse" />
            <div className="h-4 w-4/6 bg-stone-100 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  ),
})

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      <div className="mb-10 border-b border-stone-200 pb-8">
        <h1 className="text-4xl font-bold tracking-tight text-stone-900">Terms of Service</h1>
        <p className="mt-3 text-sm text-stone-500">Last updated: March 1, 2026</p>
      </div>

      <div className="space-y-10 text-stone-700">
        {/* Sections 1-3: server-rendered (above the fold) */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-900">1. Acceptance of Terms</h2>
          <p className="leading-relaxed">
            By creating an account or using the ChefFlow platform at cheflowhq.com (the
            &ldquo;Service&rdquo;), you agree to be bound by these Terms of Service
            (&ldquo;Terms&rdquo;). If you do not agree, do not use the Service. These Terms apply to
            all users, including chefs, clients, and guests who interact with the Service without an
            account.
          </p>
          <p className="mt-4 leading-relaxed">
            You must be at least 18 years old to create an account. By using the Service you
            represent that you meet this requirement and have the legal authority to enter into this
            agreement.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-900">2. Description of Service</h2>
          <p className="leading-relaxed">
            ChefFlow is a business operations platform for private chefs. It provides tools for
            managing events, menus, client communications, proposals, and payments. ChefFlow is a
            software platform only; we are not a party to any agreement between a chef and their
            client, do not employ chefs, and do not guarantee the quality or safety of any culinary
            services arranged through the platform.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-stone-900">
            3. Accounts and Registration
          </h2>
          <p className="mb-4 leading-relaxed">
            You are responsible for maintaining the confidentiality of your account credentials and
            for all activity that occurs under your account. You agree to:
          </p>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>Provide accurate, complete, and current information during registration</li>
            <li>Update your information if it changes</li>
            <li>
              Notify us immediately at{' '}
              <a href="mailto:support@cheflowhq.com" className="text-brand-700 hover:underline">
                support@cheflowhq.com
              </a>{' '}
              if you suspect unauthorized access to your account
            </li>
            <li>Not share your account credentials with others</li>
          </ul>
          <p className="mt-4 leading-relaxed">
            We reserve the right to suspend or terminate accounts that violate these Terms or that
            have been inactive for an extended period.
          </p>
        </section>

        {/* Sections 4-16: lazy-loaded (below the fold) */}
        <Suspense>
          <TermsExtendedSections />
        </Suspense>
      </div>

      <div className="mt-12 border-t border-stone-200 pt-8">
        <Link href="/" className="text-sm font-medium text-stone-600 hover:text-stone-900">
          &larr; Back to Home
        </Link>
      </div>
    </main>
  )
}
