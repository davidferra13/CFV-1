// Profile Highlights - Manage featured achievements and credentials
// Displayed prominently on the chef's public profile

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getHighlights } from '@/lib/portfolio/highlight-actions'
import { HighlightEditor } from '@/components/portfolio/highlight-editor'

export const metadata: Metadata = { title: 'Profile Highlights - ChefFlow' }

export default async function HighlightsPage() {
  const user = await requireChef()

  let highlights: Awaited<ReturnType<typeof getHighlights>> = []
  try {
    highlights = await getHighlights()
  } catch {
    highlights = []
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/settings" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Settings
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Profile Highlights</h1>
          <p className="text-stone-400 mt-1">
            Feature your key achievements, certifications, press mentions, and awards on your
            profile.
          </p>
        </div>
      </div>

      <HighlightEditor
        highlights={highlights.map((h) => ({
          id: h.id,
          title: h.title,
          category: h.category,
          items: (h.items ?? []).map(String),
          displayOrder: h.displayOrder,
        }))}
      />
    </div>
  )
}
