// Loyalty Program Guide - Chef-Facing Educational Page
// Everything a chef needs to understand about loyalty programs:
// what they are, why they work, what the best brands do, and how ChefFlow's system works.

import type { Metadata } from 'next'
import Link from 'next/link'
import { LoyaltyGuideContent } from './loyalty-guide-content'

export const metadata: Metadata = {
  title: 'Loyalty Program Guide - ChefFlow',
}

export default function LoyaltyLearnPage() {
  return (
    <div className="px-4 sm:px-6 py-8 max-w-3xl mx-auto">
      <Link
        href="/loyalty"
        className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
      >
        &larr; Loyalty Dashboard
      </Link>

      <div className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-stone-100">Understanding Loyalty Programs</h1>
        <p className="text-sm text-stone-400 mt-1">
          Everything you need to know - from the fundamentals to what the best brands in the world
          do, and how to make your program work for your clients.
        </p>
      </div>

      <LoyaltyGuideContent />

      <p className="text-center text-xs text-stone-600 mt-8 pb-8">
        This guide is based on research across 15+ loyalty programs, behavioral science studies, and
        industry data from 2025–2026.
      </p>
    </div>
  )
}
