// Incident Documentation Page
// Lists all safety incidents for the tenant and provides a link to report new ones.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { IncidentList } from '@/components/safety/incident-list'

export const metadata: Metadata = { title: 'Incident Documentation — ChefFlow' }

export default async function IncidentsPage() {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data: incidents } = await supabase
    .from('chef_incidents')
    .select('*')
    .eq('tenant_id', chef.tenantId!)
    .order('incident_date', { ascending: false })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Incident Documentation</h1>
          <p className="mt-1 text-sm text-stone-500">
            A complete log of safety incidents — foodborne illness concerns, injuries, equipment
            failures, and near-misses. Accurate records protect you legally and help prevent
            recurrence.
          </p>
        </div>
        <Link
          href="/safety/incidents/new"
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
        >
          Report Incident
        </Link>
      </div>

      <IncidentList incidents={incidents ?? []} />
    </div>
  )
}
