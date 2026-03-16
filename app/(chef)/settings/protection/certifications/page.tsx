// Protection Certifications Page
// Displays professional certifications tracked under the protection hub
// (distinct from compliance/food-safety certs tracked in /settings/compliance).

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { CertificationList } from '@/components/protection/certification-list'

export const metadata: Metadata = { title: 'Certifications | ChefFlow' }

export default async function ProtectionCertificationsPage() {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data: certs } = await supabase
    .from('chef_certifications')
    .select('*')
    .eq('tenant_id', chef.tenantId!)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Certifications</h1>
        <p className="mt-1 text-sm text-stone-500">
          Track your active certifications, renewal dates, and issuing bodies. Expiry alerts help
          ensure credentials never lapse.
        </p>
      </div>

      <CertificationList certs={certs ?? []} />
    </div>
  )
}
