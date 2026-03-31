// Embed Widget Settings Page
// Shows chefs their embed code with full setup instructions for every platform

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { EmbedCodePanel } from '@/components/settings/embed-code-panel'

export const metadata: Metadata = { title: 'Website Widget' }

export default async function EmbedSettingsPage() {
  const user = await requireChef()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-stone-100">Website Widget</h1>
        <p className="text-stone-400 mt-1">
          Add a booking form to your existing website. Works on Wix, Squarespace, WordPress, and any
          site that supports custom HTML.
        </p>
      </div>

      <EmbedCodePanel chefId={user.entityId} />
    </div>
  )
}
