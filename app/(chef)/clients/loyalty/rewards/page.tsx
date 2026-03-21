import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getVoucherAndGiftCards, getIncentiveStats } from '@/lib/loyalty/voucher-actions'
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
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'Rewards - ChefFlow' }

const TYPE_STYLES: Record<string, string> = {
  gift_card: 'bg-green-900 text-green-700',
  voucher: 'bg-purple-900 text-purple-700',
  discount: 'bg-brand-900 text-brand-700',
  complimentary: 'bg-amber-900 text-amber-700',
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-900 text-green-700',
  redeemed: 'bg-stone-700 text-stone-500',
  expired: 'bg-red-900 text-red-600',
  inactive: 'bg-stone-800 text-stone-500',
}

export default async function RewardsPage() {
  await requireChef()
  const [incentives, stats] = await Promise.all([getVoucherAndGiftCards(), getIncentiveStats()])

  const getStatus = (i: (typeof incentives)[0]) => {
    if (i.redemptions_used >= i.max_redemptions) return 'redeemed'
    if (!i.is_active) return 'inactive'
    if (i.expires_at && new Date(i.expires_at) < new Date()) return 'expired'
    return 'active'
  }
  const active = incentives.filter((i) => getStatus(i) === 'active')
  const redeemed = incentives.filter((i) => getStatus(i) === 'redeemed')

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients/loyalty" className="text-sm text-stone-500 hover:text-stone-300">
          ← Loyalty Program
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Rewards</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {incentives.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Gift cards and vouchers issued to your clients</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{stats.totalIssued}</p>
          <p className="text-sm text-stone-500 mt-1">Total issued</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{active.length}</p>
          <p className="text-sm text-stone-500 mt-1">Active</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-500">{redeemed.length}</p>
          <p className="text-sm text-stone-500 mt-1">Redeemed</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-amber-700">
            {formatCurrency(stats.totalValueAppliedCents)}
          </p>
          <p className="text-sm text-stone-500 mt-1">Total value applied</p>
        </Card>
      </div>

      {incentives.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No rewards issued yet</p>
          <p className="text-stone-400 text-sm">
            Create gift cards and vouchers from individual client profiles
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incentives.map((incentive) => (
                <TableRow key={incentive.id}>
                  <TableCell className="font-mono text-sm font-semibold text-stone-100">
                    {incentive.code}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${TYPE_STYLES[incentive.type] ?? 'bg-stone-800 text-stone-400'}`}
                    >
                      {incentive.type.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {incentive.amount_cents != null
                      ? formatCurrency(incentive.amount_cents)
                      : incentive.discount_percent != null
                        ? `${incentive.discount_percent}% off`
                        : '-'}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const s = getStatus(incentive)
                      return (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[s] ?? 'bg-stone-800 text-stone-400'}`}
                        >
                          {s}
                        </span>
                      )
                    })()}
                  </TableCell>
                  <TableCell className="text-stone-500 text-sm">
                    {format(new Date(incentive.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-stone-500 text-sm">
                    {incentive.expires_at
                      ? format(new Date(incentive.expires_at), 'MMM d, yyyy')
                      : '-'}
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
