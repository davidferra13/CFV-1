import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getClientsWithStats } from '@/lib/clients/actions'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

export const metadata: Metadata = { title: 'Loyalty Points - ChefFlow' }

const TIER_STYLES: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-800',
  silver: 'bg-stone-200 text-stone-700',
  gold: 'bg-yellow-100 text-yellow-800',
  platinum: 'bg-sky-100 text-sky-800',
}

export default async function LoyaltyPointsPage() {
  await requireChef()
  const clients = await getClientsWithStats()

  const withPoints = [...clients]
    .filter(c => (c.loyalty_points as number | null) != null && (c.loyalty_points as number) > 0)
    .sort((a, b) => ((b.loyalty_points as number) ?? 0) - ((a.loyalty_points as number) ?? 0))

  const totalPoints = withPoints.reduce((sum, c) => sum + ((c.loyalty_points as number) ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients/loyalty" className="text-sm text-stone-500 hover:text-stone-700">
          ← Loyalty Program
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-900">Points</h1>
          <span className="bg-stone-100 text-stone-600 text-sm px-2 py-0.5 rounded-full">
            {withPoints.length} clients
          </span>
        </div>
        <p className="text-stone-500 mt-1">Point balances across your loyalty program members</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-900">{totalPoints.toLocaleString()}</p>
          <p className="text-sm text-stone-500 mt-1">Total points outstanding</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-amber-700">{withPoints.length}</p>
          <p className="text-sm text-stone-500 mt-1">Members with points balance</p>
        </Card>
      </div>

      {withPoints.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-600 font-medium mb-1">No points balances yet</p>
          <p className="text-stone-400 text-sm">Points are awarded to clients through the loyalty program</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Points Balance</TableHead>
                <TableHead>Total Events</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withPoints.map(client => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    <Link href={`/clients/${client.id}`} className="text-brand-600 hover:text-brand-800 hover:underline">
                      {client.full_name}
                    </Link>
                    {client.email && (
                      <p className="text-xs text-stone-400 mt-0.5">{client.email}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {client.loyalty_tier ? (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${TIER_STYLES[client.loyalty_tier as string] ?? 'bg-stone-100 text-stone-600'}`}>
                        {client.loyalty_tier as string}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-stone-900 font-semibold text-sm">
                    {((client.loyalty_points as number) ?? 0).toLocaleString()} pts
                  </TableCell>
                  <TableCell className="text-stone-600 text-sm">{client.totalEvents ?? 0}</TableCell>
                  <TableCell>
                    <Link href={`/clients/${client.id}`}>
                      <span className="text-xs text-brand-600 hover:underline cursor-pointer">View Profile</span>
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
