// Quick Capture - friction-free recipe capture
// Snap a photo, record a voice note, or jot down basics.
// Saves as a draft recipe to flesh out later.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { QuickCaptureForm } from '@/components/recipes/quick-capture-form'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Quick Capture | Recipes' }

export default async function QuickCapturePage() {
  await requireChef()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Quick Capture</h1>
          <p className="mt-1 text-sm text-stone-400">
            Capture a recipe idea fast. Flesh it out later.
          </p>
        </div>
        <Link
          href="/recipes"
          className="rounded-lg border border-stone-600 px-3 py-1.5 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800"
        >
          Back
        </Link>
      </div>

      <QuickCaptureForm />
    </div>
  )
}
