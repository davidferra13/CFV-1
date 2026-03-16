import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { isAdmin } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'
import { getIncidentDashboard } from '@/lib/incidents/reader'
import { IncidentsDashboard } from '@/components/settings/incidents-dashboard'

export const metadata: Metadata = { title: 'System Incidents - ChefFlow' }

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; system?: string; severity?: string }>
}) {
  const user = await requireChef()

  // Admin-only page - regular chefs should not see infrastructure reports
  const userIsAdmin = await isAdmin()
  if (!userIsAdmin) {
    redirect('/settings')
  }

  const params = await searchParams
  const data = await getIncidentDashboard({
    date: params.date,
    system: params.system,
    severity: params.severity,
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">System Incidents</h1>
        <p className="text-stone-400 mt-1">
          Automatic failure reports from Ollama, the task queue, circuit breakers, and health
          checks. Only real problems show up here - retries and expected offline states are filtered
          out.
        </p>
      </div>

      <IncidentsDashboard data={data} />
    </div>
  )
}
