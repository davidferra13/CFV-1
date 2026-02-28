// Insurance Policies Page
// Displays all insurance policies for the tenant with status and expiry details.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { InsuranceList } from '@/components/protection/insurance-list'

export const metadata: Metadata = { title: 'Insurance Policies — ChefFlow' }

export default async function InsurancePoliciesPage() {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data: policies } = await supabase
    .from('chef_insurance_policies')
    .select('*')
    .eq('tenant_id', chef.tenantId!)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Insurance Policies</h1>
        <p className="mt-1 text-sm text-stone-500">
          Document your coverage — general liability, food contamination, workers&apos; comp, and
          umbrella policies. Staying current protects you, your clients, and your business.
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-950 px-4 py-3">
        <p className="text-sm text-blue-900">
          Set expiry reminders so you never lapse on coverage. Clients increasingly ask for proof of
          insurance before booking — keep your certificates accessible here.
        </p>
      </div>

      <InsuranceList policies={policies ?? []} />
    </div>
  )
}
