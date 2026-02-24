// Create New Audit Page

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { CreateAuditClient } from './create-audit-client'

export const metadata: Metadata = { title: 'New Audit - ChefFlow' }

export default async function NewAuditPage() {
  await requireChef()

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory/audits" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Audits
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Create Inventory Audit</h1>
        <p className="text-stone-500 mt-1">
          Start a physical count audit. Select the type and scope, then count items on the sheet.
        </p>
      </div>

      <CreateAuditClient />
    </div>
  )
}
