// Audit Detail Page - Count Sheet + Finalize

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getAuditDetail } from '@/lib/inventory/audit-actions'
import { AuditDetailClient } from './audit-detail-client'

export const metadata: Metadata = { title: 'Audit Detail - ChefFlow' }

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireChef()
  const { id } = await params

  const audit = await getAuditDetail(id).catch(() => null)

  if (!audit) {
    return (
      <div className="space-y-6">
        <Link href="/inventory/audits" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Audits
        </Link>
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500">Audit not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory/audits" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Audits
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Audit Count Sheet</h1>
      </div>

      <AuditDetailClient audit={audit as any} />
    </div>
  )
}
