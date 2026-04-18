// Inventory Audits Page
// List all audits with status and type filters.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getAudits } from '@/lib/inventory/audit-actions'
import { AuditsClient } from './audits-client'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Inventory Audits' }

export default async function AuditsPage() {
  await requireChef()

  const audits = await getAudits({}).catch(() => [])

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Inventory
        </Link>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Inventory Audits</h1>
            <p className="text-stone-500 mt-1">
              Physical count audits to verify stock levels match your records.
            </p>
          </div>
          <Button href="/inventory/audits/new" size="sm">
            + New Audit
          </Button>
        </div>
      </div>

      <AuditsClient initialAudits={audits as any[]} />
    </div>
  )
}
