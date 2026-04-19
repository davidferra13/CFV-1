import type { Metadata } from 'next'
import Link from 'next/link'
import { SubmitListingForm } from './_components/submit-listing-form'

export const metadata: Metadata = {
  title: 'Add Your Business - Nearby',
  description:
    'Submit your restaurant, catering business, food truck, bakery, or private chef service to the Nearby directory. Free listing, no commission.',
}

export default function SubmitListingPage() {
  return (
    <div className="min-h-screen">
      <div className="border-b border-stone-800/50">
        <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
          <Link
            href="/nearby"
            className="text-sm text-stone-400 transition-colors hover:text-stone-200"
          >
            &larr; Back to Nearby
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold text-stone-100">Add your business</h1>
        <p className="mt-2 text-sm text-stone-400">
          List your restaurant, catering business, food truck, bakery, or private chef service. Your
          listing is free and links directly to your website. No middleman, no commission.
        </p>

        <div className="mt-4 rounded-xl border border-stone-800 bg-stone-900/50 p-4">
          <p className="text-xs font-semibold text-stone-300">What you get</p>
          <ul className="mt-2 space-y-1 text-xs text-stone-400">
            <li>- A verified listing with your business details</li>
            <li>- Direct link to your website (we send traffic to you, not to us)</li>
            <li>- Photos, menu link, and hours (you control what is shown)</li>
            <li>- Removal at any time, no questions asked</li>
          </ul>
        </div>

        <div className="mt-8">
          <SubmitListingForm />
        </div>
      </div>
    </div>
  )
}
