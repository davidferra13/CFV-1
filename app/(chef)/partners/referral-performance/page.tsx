import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getPartnerLeaderboard, getConversionRatesBySource } from '@/lib/partners/analytics'
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

export const metadata: Metadata = { title: 'Referral Performance' }

export default async function ReferralPerformancePage() {
  await requireChef()
  const [leaderboard, conversions] = await Promise.all([
    getPartnerLeaderboard(),
    getConversionRatesBySource(),
  ])

  const totalRevenue = leaderboard.reduce((sum, p) => sum + p.revenue_cents, 0)
  const totalEvents = leaderboard.reduce((sum, p) => sum + p.event_count, 0)
  const totalInquiries = leaderboard.reduce((sum, p) => sum + p.inquiry_count, 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/partners" className="text-sm text-stone-500 hover:text-stone-300">
          ← Partners
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Referral Performance</h1>
        </div>
        <p className="text-stone-500 mt-1">
          Revenue and conversion metrics attributed to each partner
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-stone-500 mt-1">Total partner revenue</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{totalEvents}</p>
          <p className="text-sm text-stone-500 mt-1">Events from partners</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-amber-700">{totalInquiries}</p>
          <p className="text-sm text-stone-500 mt-1">Total partner inquiries</p>
        </Card>
      </div>

      {leaderboard.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No partner referral data yet</p>
          <p className="text-stone-400 text-sm">
            Partner attribution will appear here once inquiries are linked to partners
          </p>
        </Card>
      ) : (
        <Card>
          <div className="p-4 border-b border-stone-800">
            <h2 className="text-sm font-semibold text-stone-300">Partner Leaderboard</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Inquiries</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Conversion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((partner, i) => (
                <TableRow key={partner.id}>
                  <TableCell className="text-stone-400 text-sm font-mono">#{i + 1}</TableCell>
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
                  <TableCell className="text-stone-400 text-sm">{partner.inquiry_count}</TableCell>
                  <TableCell className="text-stone-400 text-sm">{partner.event_count}</TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {partner.completed_count}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {formatCurrency(partner.revenue_cents)}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {(partner.conversion_rate * 100).toFixed(0)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {conversions.length > 0 && (
        <Card>
          <div className="p-4 border-b border-stone-800">
            <h2 className="text-sm font-semibold text-stone-300">Conversion by Channel</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead>Inquiries</TableHead>
                <TableHead>Confirmed</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Conversion Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversions.map((row) => {
                const rate =
                  row.inquiries > 0 ? ((row.confirmed / row.inquiries) * 100).toFixed(0) : '0'
                return (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-stone-400 text-sm">{row.inquiries}</TableCell>
                    <TableCell className="text-stone-400 text-sm">{row.confirmed}</TableCell>
                    <TableCell className="text-stone-400 text-sm">{row.completed}</TableCell>
                    <TableCell className="text-stone-400 text-sm">{rate}%</TableCell>
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
