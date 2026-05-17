import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getClientRankings } from '@/lib/clients/rankings'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

export const metadata: Metadata = { title: 'Dormant High-Value Clients' }

export default async function DormantHighValuePage() {
  await requireChef()
  const { dormantHighValue } = await getClientRankings()

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients/insights" className="text-sm text-stone-500 hover:text-stone-300">
          ← Client Insights
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">{dormantHighValue.title}</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {dormantHighValue.clients.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">{dormantHighValue.description}</p>
      </div>

      {dormantHighValue.clients.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No dormant high-value clients</p>
          <p className="text-stone-400 text-sm">
            All clients with revenue are active (event within 90 days)
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Lifetime Spend</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dormantHighValue.clients.map((client, idx) => (
                <TableRow key={client.id}>
                  <TableCell className="font-mono text-stone-500">{idx + 1}</TableCell>
                  <TableCell>
                    <Link
                      href={`/clients/${client.id}`}
                      className="text-brand-400 hover:text-brand-300 font-medium"
                    >
                      {client.fullName}
                    </Link>
                  </TableCell>
                  <TableCell className="font-semibold text-stone-100">
                    {formatCurrency(client.metric)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/clients/${client.id}#outreach`}
                      className="text-xs text-amber-400 hover:text-amber-300"
                    >
                      Re-engage
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
