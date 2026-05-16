import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getBusinessHistoryImportDashboard } from '@/lib/business-history-import/actions'
import { BusinessHistoryProgressDashboard } from '@/components/imports/business-history/progress-dashboard'
import { BusinessHistoryRetentionControls } from '@/components/imports/business-history/retention-controls'
import { BusinessHistoryReviewQueue } from '@/components/imports/business-history/review-queue'
import { BusinessHistorySourceChooser } from '@/components/imports/business-history/source-chooser'

export const metadata: Metadata = { title: 'Business History Import' }

export default async function BusinessHistoryImportPage() {
  await requireChef()
  const { summary, findings } = await getBusinessHistoryImportDashboard()

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Link href="/dashboard" className="hover:text-stone-300">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/import" className="hover:text-stone-300">
          Smart Import
        </Link>
        <span>/</span>
        <span>Business History</span>
      </div>

      <BusinessHistorySourceChooser />
      <BusinessHistoryProgressDashboard summary={summary} />
      <BusinessHistoryReviewQueue findings={findings} />
      <BusinessHistoryRetentionControls />
    </main>
  )
}
