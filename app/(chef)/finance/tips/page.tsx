import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getTipPoolConfigs } from '@/lib/finance/staff-tip-actions'
import { TipEntryForm } from '@/components/finance/tip-entry'
import { TipDistributionPanel } from '@/components/finance/tip-distribution'
import { TipPoolSettings } from '@/components/finance/tip-pool-settings'

export const metadata: Metadata = { title: 'Tip Management - ChefFlow' }

export default async function TipsPage() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get active staff members
  const { data: staffData } = await supabase
    .from('staff_members')
    .select('id, name, role')
    .eq('chef_id', user.entityId)
    .eq('status', 'active')
    .order('name')

  const staffMembers = (staffData || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    role: s.role,
  }))

  // Get pool configs
  const poolConfigs = await getTipPoolConfigs().catch(() => [])

  return (
    <div className="space-y-8">
      <div>
        <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Finance
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Tip Management</h1>
        <p className="text-stone-500 mt-1">
          Record tips by shift, configure pooling rules, and distribute tips to staff.
        </p>
      </div>

      {/* Tab-like sections */}
      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-stone-200 mb-4">Record Tips</h2>
          <TipEntryForm staffMembers={staffMembers} />
        </section>

        <hr className="border-stone-700" />

        <section>
          <h2 className="text-xl font-semibold text-stone-200 mb-4">Distribute Tips</h2>
          <TipDistributionPanel poolConfigs={poolConfigs} />
        </section>

        <hr className="border-stone-700" />

        <section>
          <h2 className="text-xl font-semibold text-stone-200 mb-4">Pool Settings</h2>
          <TipPoolSettings initialConfigs={poolConfigs} />
        </section>
      </div>
    </div>
  )
}
