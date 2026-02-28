import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { get1099Summary, getContractorPayments } from '@/lib/finance/contractor-actions'
import { Contractor1099Panel } from '@/components/finance/contractor-1099-panel'

export const metadata: Metadata = { title: '1099 Contractors - ChefFlow' }

export default async function ContractorsPage() {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const currentYear = new Date().getFullYear()

  const [summary, payments, staffResult] = await Promise.all([
    get1099Summary(currentYear).catch(() => null),
    getContractorPayments().catch(() => null),
    supabase
      .from('staff_members')
      .select('id, name, contractor_type')
      .eq('chef_id', user.tenantId!)
      .eq('status', 'active'),
  ])

  const staff = (staffResult?.data ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    contractorType: s.contractor_type ?? null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Finance
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">1099 Contractors</h1>
        <p className="text-stone-500 mt-1">
          Track contractor payments, generate 1099 forms, and manage compliance
        </p>
      </div>

      <Contractor1099Panel
        summaries={summary ?? []}
        recentPayments={payments ?? []}
        staffMembers={staff}
        taxYear={currentYear}
      />
    </div>
  )
}
