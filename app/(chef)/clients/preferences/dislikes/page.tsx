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

export const metadata: Metadata = { title: 'Client Dislikes' }

export default async function DislikesPage() {
  await requireChef()
  const clients = await getClientsWithStats()

  const clientsWithDislikes = clients
    .filter((c: any) => c.dislikes && (c.dislikes as string[]).length > 0)
    .sort((a: any, b: any) => a.full_name.localeCompare(b.full_name))

  // Aggregate dislike mentions
  const dislikeCounts: Record<string, number> = {}
  for (const client of clientsWithDislikes) {
    for (const d of client.dislikes as string[]) {
      dislikeCounts[d] = (dislikeCounts[d] ?? 0) + 1
    }
  }
  const commonDislikes = Object.entries(dislikeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients/preferences" className="text-sm text-stone-500 hover:text-stone-300">
          ← Client Preferences
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Dislikes</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {clientsWithDislikes.length} clients
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          Ingredients and dishes to avoid when planning menus for each client
        </p>
      </div>

      {commonDislikes.length > 0 && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-stone-300 mb-3">Most Common Dislikes</h2>
          <div className="flex flex-wrap gap-2">
            {commonDislikes.map(([item, count]) => (
              <span
                key={item}
                className="bg-stone-700 text-stone-300 text-sm px-3 py-1 rounded-full"
              >
                {item} {count > 1 && <span className="text-stone-500 font-semibold">×{count}</span>}
              </span>
            ))}
          </div>
        </Card>
      )}

      {clientsWithDislikes.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No dislikes on file</p>
          <p className="text-stone-400 text-sm">
            Add disliked items to client profiles to see them here
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Dislikes / Avoid</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientsWithDislikes.map((client: any) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/clients/${client.id}`}
                      className="text-brand-600 hover:text-brand-300 hover:underline"
                    >
                      {client.full_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(client.dislikes as string[]).map((d) => (
                        <span
                          key={d}
                          className="bg-stone-700 text-stone-300 text-xs px-2 py-0.5 rounded-full"
                        >
                          {d}
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
