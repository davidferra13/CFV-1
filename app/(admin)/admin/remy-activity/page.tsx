import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/admin'
import { RemyAbuseSummary } from '@/components/admin/remy-abuse-summary'

export const metadata: Metadata = { title: 'Remy Activity' }

export default async function AdminRemyActivityPage() {
  await requireAdmin()

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <Link href="/admin" className="inline-flex text-sm text-stone-500 hover:text-stone-300">
          Back to Admin
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Remy Activity</h1>
          <p className="mt-1 text-sm text-stone-400">
            Review Remy safety activity, blocked users, and recent critical violations.
          </p>
        </div>
      </div>

      <RemyAbuseSummary />
    </div>
  )
}
