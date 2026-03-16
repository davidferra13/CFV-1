// Client-Facing Loyalty Program About Page
// Designed to make clients excited about participating in the loyalty program.
// Warm, inviting, and aspirational - shows what they can earn and why it matters.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { LoyaltyAboutContent } from './loyalty-about-content'

export const metadata: Metadata = {
  title: 'About Your Rewards - ChefFlow',
}

export default async function LoyaltyAboutPage() {
  // Ensure they're authenticated as a client
  await requireClient()

  return (
    <div className="px-4 sm:px-6 py-8 max-w-3xl mx-auto">
      <Link
        href="/my-rewards"
        className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
      >
        &larr; My Rewards
      </Link>

      <div className="mt-6">
        <LoyaltyAboutContent />
      </div>

      <p className="text-center text-xs text-stone-600 mt-8 pb-8">
        Questions about your rewards? Ask your chef - they&rsquo;ll be happy to help.
      </p>
    </div>
  )
}
