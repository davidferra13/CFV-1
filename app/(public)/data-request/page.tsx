// Data Request Page
// GDPR/CCPA self-serve form: access, correction, deletion, and portability requests.
// No account required - for clients and visitors who don't have chef accounts.

import type { Metadata } from 'next'
import Link from 'next/link'
import { DataRequestForm } from './data-request-form'

export const metadata: Metadata = {
  title: 'Data Request - ChefFlow',
  description: 'Submit a request to access, correct, delete, or export your personal data.',
}

export default function DataRequestPage() {
  return (
    <div className="min-h-screen bg-stone-950 py-16 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <Link href="/privacy" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Privacy Policy
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-3">Data Request</h1>
          <p className="text-stone-400 mt-2">
            Submit a request to access, correct, delete, or export your personal data. We respond
            within 30 days.
          </p>
        </div>

        <DataRequestForm />

        <p className="text-xs text-stone-600 mt-6 text-center">
          You can also reach us directly at{' '}
          <a href="mailto:privacy@cheflowhq.com" className="hover:underline">
            privacy@cheflowhq.com
          </a>
        </p>
      </div>
    </div>
  )
}
