// Protection Certifications Page
// Displays professional certifications tracked under the protection hub
// (distinct from compliance/food-safety certs tracked in /settings/compliance).

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { CertificationList } from '@/components/protection/certification-list'

export const metadata: Metadata = { title: 'Certifications' }

export default async function ProtectionCertificationsPage() {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: certs } = await db
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

      <div className="rounded-lg border border-stone-700 bg-stone-900/70 px-4 py-3">
        <p className="text-sm text-stone-300">
          Active certification records can surface as public current-record badges on your chef
          profile. Public buyers should only see those badges when ChefFlow has an active record on
          file. Review the public model in the{' '}
          <Link href="/trust" className="font-medium text-brand-400 hover:text-brand-300">
            Trust Center
          </Link>
          .
        </p>
      </div>

      <CertificationList certs={certs ?? []} />
    </div>
  )
}
