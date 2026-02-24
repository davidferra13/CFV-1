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

export const metadata: Metadata = { title: 'Dietary Restrictions - ChefFlow' }

export default async function DietaryRestrictionsPage() {
  await requireChef()
  const clients = await getClientsWithStats()

  const clientsWithRestrictions = clients
    .filter((c) => c.dietary_restrictions && (c.dietary_restrictions as string[]).length > 0)
    .sort((a, b) => a.full_name.localeCompare(b.full_name))

  // Aggregate restriction counts
  const restrictionCounts: Record<string, number> = {}
  for (const client of clientsWithRestrictions) {
    for (const r of client.dietary_restrictions as string[]) {
      restrictionCounts[r] = (restrictionCounts[r] ?? 0) + 1
    }
  }
  const topRestrictions = Object.entries(restrictionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients/preferences" className="text-sm text-stone-500 hover:text-stone-300">
          ← Client Preferences
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Dietary Restrictions</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {clientsWithRestrictions.length} clients
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          Vegetarian, vegan, kosher, halal, and other dietary requirements on file
        </p>
      </div>

      {topRestrictions.length > 0 && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-stone-300 mb-3">Most Common</h2>
          <div className="flex flex-wrap gap-2">
            {topRestrictions.map(([restriction, count]) => (
              <span
                key={restriction}
                className="bg-amber-900 text-amber-800 text-sm px-3 py-1 rounded-full"
              >
                {restriction} <span className="text-amber-600 font-semibold">×{count}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {clientsWithRestrictions.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No dietary restrictions on file</p>
          <p className="text-stone-400 text-sm">
            Add restrictions to client profiles to see them here
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Restrictions</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientsWithRestrictions.map((client) => (
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
                      {(client.dietary_restrictions as string[]).map((r) => (
                        <span
                          key={r}
                          className="bg-amber-900 text-amber-800 text-xs px-2 py-0.5 rounded-full"
                        >
                          {r}
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
