import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getClientsWithStats } from '@/lib/clients/actions'
import { createServerClient } from '@/lib/db/server'
import { SEVERITY_LABELS, type CanonicalSeverity } from '@/lib/dietary/catalog'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

export const metadata: Metadata = { title: 'Client Allergies' }

type AllergyRecord = {
  allergen: string
  severity: string
  source: string
  confirmed_by_chef: boolean
  client_id: string
}

function severityBadge(severity: string) {
  const label = SEVERITY_LABELS[severity as CanonicalSeverity] ?? severity
  const colors =
    severity === 'anaphylaxis'
      ? 'bg-red-900/80 text-red-300'
      : severity === 'allergy'
        ? 'bg-amber-900/60 text-amber-300'
        : 'bg-stone-800 text-stone-400'

  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors}`}>{label}</span>
}

export default async function AllergiesPage() {
  const user = await requireChef()
  const db: any = createServerClient()

  const [clients, { data: allergyRecords }] = await Promise.all([
    getClientsWithStats(),
    db
      .from('client_allergy_records')
      .select('allergen, severity, source, confirmed_by_chef, client_id')
      .eq('tenant_id', user.tenantId!),
  ])

  const records: AllergyRecord[] = allergyRecords ?? []

  // Build a map of client_id -> structured allergy records
  const recordsByClient = new Map<string, AllergyRecord[]>()
  for (const r of records) {
    const list = recordsByClient.get(r.client_id) ?? []
    list.push(r)
    recordsByClient.set(r.client_id, list)
  }

  // Merge: clients with structured records OR legacy flat allergies array
  const clientsWithAllergies = clients
    .filter((c: any) => {
      const hasRecords = recordsByClient.has(c.id)
      const hasLegacy = c.allergies && (c.allergies as string[]).length > 0
      return hasRecords || hasLegacy
    })
    .sort((a: any, b: any) => a.full_name.localeCompare(b.full_name))

  // Aggregate allergy counts from structured records first, legacy as fallback
  const allergyCounts: Record<string, number> = {}
  for (const client of clientsWithAllergies) {
    const structured = recordsByClient.get(client.id)
    if (structured) {
      for (const r of structured) {
        allergyCounts[r.allergen] = (allergyCounts[r.allergen] ?? 0) + 1
      }
    } else {
      for (const a of (client as any).allergies as string[]) {
        allergyCounts[a] = (allergyCounts[a] ?? 0) + 1
      }
    }
  }
  const topAllergies = Object.entries(allergyCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients/preferences" className="text-sm text-stone-500 hover:text-stone-300">
          ← Client Preferences
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Allergies</h1>
          <span className="bg-red-900 text-red-700 text-sm px-2 py-0.5 rounded-full">
            {clientsWithAllergies.length} clients
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          Food allergy records across your entire clientele, critical for event planning
        </p>
      </div>

      {topAllergies.length > 0 && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-stone-300 mb-3">Most Common Allergies</h2>
          <div className="flex flex-wrap gap-2">
            {topAllergies.map(([allergy, count]) => (
              <span
                key={allergy}
                className="bg-red-900 text-red-800 text-sm px-3 py-1 rounded-full"
              >
                {allergy} <span className="text-red-600 font-semibold">&times;{count}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {clientsWithAllergies.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No allergies on file</p>
          <p className="text-stone-400 text-sm">
            Add allergy information to client profiles to see it here
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Allergies</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientsWithAllergies.map((client: any) => {
                const structured = recordsByClient.get(client.id)
                return (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-brand-600 hover:text-brand-300 hover:underline"
                      >
                        {client.full_name}
                      </Link>
                      {client.email && (
                        <p className="text-xs text-stone-400 mt-0.5">{client.email}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {structured
                          ? structured.map((r) => (
                              <span key={r.allergen} className="inline-flex items-center gap-1">
                                <span className="bg-red-900 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                  {r.allergen}
                                </span>
                                {severityBadge(r.severity)}
                              </span>
                            ))
                          : ((client.allergies ?? []) as string[]).map((a) => (
                              <span
                                key={a}
                                className="bg-red-900 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full"
                              >
                                {a}
                              </span>
                            ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/clients/${client.id}`}>
                        <span className="text-xs text-brand-600 hover:underline cursor-pointer">
                          View Profile
                        </span>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
