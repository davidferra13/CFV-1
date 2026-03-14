'use client'

import { AlertTriangle } from '@/components/ui/icons'
import Link from 'next/link'

type Props = {
  scheduledFor: string
  daysRemaining: number
}

/**
 * Banner shown at the top of the chef layout when account deletion is pending.
 * Includes countdown and links to cancel or export data.
 */
export function DeletionPendingBanner({ scheduledFor, daysRemaining }: Props) {
  const formattedDate = new Date(scheduledFor).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="bg-red-900/50 border-b border-red-800 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-200">
            <strong>Account deletion scheduled.</strong> Your account and data will be permanently
            deleted on {formattedDate} ({daysRemaining} day{daysRemaining !== 1 ? 's' : ''}{' '}
            remaining). You have full access until then.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/settings/compliance/gdpr"
            className="text-xs font-medium text-red-300 hover:text-red-100 underline"
          >
            Export Data
          </Link>
          <Link
            href="/settings/delete-account"
            className="text-xs font-medium bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded"
          >
            Cancel Deletion
          </Link>
        </div>
      </div>
    </div>
  )
}
