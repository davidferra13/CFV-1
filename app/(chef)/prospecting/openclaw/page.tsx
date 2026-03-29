import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { getOpenClawLeads } from '@/lib/prospecting/openclaw-import'
import { OpenClawLeadsBrowser } from '@/components/prospecting/openclaw-leads-browser'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'OpenClaw Leads - ChefFlow' }

export default async function OpenClawLeadsPage() {
  await requireAdmin()
  await requireChef()

  const { leads, total } = await getOpenClawLeads({ page: 1, limit: 25 })

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/prospecting"
          className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 mb-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Prospects
        </Link>
        <h1 className="text-3xl font-bold text-stone-100">OpenClaw Leads</h1>
        <p className="text-stone-400 mt-1">
          Businesses scraped by OpenClaw. Import the best into your prospect pipeline.
        </p>
      </div>

      <OpenClawLeadsBrowser initialLeads={leads} initialTotal={total} />
    </div>
  )
}
