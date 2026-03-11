import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getPartnerLeaderboard } from '@/lib/partners/analytics'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Events Generated - ChefFlow' }

export default async function EventsGeneratedPage() {
  await requireChef()
  const leaderboard = await getPartnerLeaderboard()
  const activePartners = leaderboard
    .filter((p) => p.event_count > 0)
    .sort((a, b) => b.event_count - a.event_count)

  const totalEvents = activePartners.reduce((sum, p) => sum + p.event_count, 0)
  const totalCompleted = activePartners.reduce((sum, p) => sum + p.completed_count, 0)
  const totalRevenue = activePartners.reduce((sum, p) => sum + p.revenue_cents, 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/partners" className="text-sm text-stone-500 hover:text-stone-300">
          ← Partners
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Events Generated</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {activePartners.length} partners
          </span>
        </div>
        <p className="text-stone-500 mt-1">Events that originated from partner referrals</p>
      </div>

      {activePartners.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">{totalEvents}</p>
            <p className="text-sm text-stone-500 mt-1">Total events from partners</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-green-200">{totalCompleted}</p>
            <p className="text-sm text-stone-500 mt-1">Completed events</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-amber-200">{formatCurrency(totalRevenue)}</p>
            <p className="text-sm text-stone-500 mt-1">Partner-attributed revenue</p>
          </Card>
        </div>
      )}

      {activePartners.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No partner-generated events yet</p>
          <p className="text-stone-400 text-sm">
            Events will appear here once partners are linked to inquiries that become events
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Guests Served</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activePartners.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/partners/${partner.id}`}
                      className="text-brand-600 hover:text-brand-300 hover:underline"
                    >
                      {partner.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm capitalize">
                    {partner.partner_type.replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">{partner.event_count}</TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {partner.completed_count}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {partner.guest_count > 0 ? partner.guest_count : '—'}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {formatCurrency(partner.revenue_cents)}
                  </TableCell>
                  <TableCell>
                    <Link href={`/partners/${partner.id}`}>
                      <button type="button" className="text-xs text-brand-600 hover:underline">
                        View
                      </button>
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
