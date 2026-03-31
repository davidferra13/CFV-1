import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getClientsWithStats } from '@/lib/clients/actions'
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

export default async function AllergiesPage() {
  await requireChef()
  const clients = await getClientsWithStats()

  const clientsWithAllergies = clients
    .filter((c: any) => c.allergies && (c.allergies as string[]).length > 0)
    .sort((a: any, b: any) => a.full_name.localeCompare(b.full_name))

  // Aggregate allergy counts
  const allergyCounts: Record<string, number> = {}
  for (const client of clientsWithAllergies) {
    for (const a of client.allergies as string[]) {
      allergyCounts[a] = (allergyCounts[a] ?? 0) + 1
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
          Food allergy records across your entire clientele - critical for event planning
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
                {allergy} <span className="text-red-600 font-semibold">×{count}</span>
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
              {clientsWithAllergies.map((client: any) => (
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
                    <div className="flex flex-wrap gap-1">
                      {(client.allergies as string[]).map((a) => (
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
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
