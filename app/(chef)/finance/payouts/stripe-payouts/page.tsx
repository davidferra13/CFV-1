import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getChefPayoutSummary, getChefTransfers } from '@/lib/stripe/payout-actions'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

export const metadata: Metadata = { title: 'Stripe Payouts' }

export default async function StripePayoutsPage() {
  await requireChef()

  const [summary, transfers] = await Promise.all([
    getChefPayoutSummary(),
    getChefTransfers({ limit: 50 }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/payouts" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Payouts
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Stripe Payouts</h1>
          <span className="bg-violet-900 text-violet-700 text-sm px-2 py-0.5 rounded-full">
            {summary.transferCount}
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          Transfers from client payments to your Stripe Connect account
        </p>
      </div>

      {!summary.onboardingComplete && (
        <Card className="p-4 bg-amber-950 border-amber-200">
          <p className="text-sm text-amber-800 font-medium">Stripe Connect not set up</p>
          <p className="text-sm text-amber-700 mt-1">
            Complete your Stripe Connect onboarding in{' '}
            <Link href="/settings" className="underline font-medium">
              Settings
            </Link>{' '}
            to start receiving direct transfers from client payments.
          </p>
        </Card>
      )}

      {summary.onboardingComplete && (
        <Card className="p-4 bg-violet-950 border-violet-200">
          <p className="text-sm text-violet-800 font-medium">Stripe Connect active</p>
          <p className="text-sm text-violet-700 mt-1">
            Client payments are automatically transferred to your connected Stripe account. Stripe
            then pays out to your bank on a rolling basis (usually T+2 business days). For exact
            payout details, visit your <strong>Stripe Dashboard</strong>.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">
            {formatCurrency(summary.totalNetReceivedCents)}
          </p>
          <p className="text-sm text-stone-500 mt-1">Net received</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">
            {formatCurrency(summary.totalTransferredCents)}
          </p>
          <p className="text-sm text-stone-500 mt-1">Gross volume</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-500">
            {formatCurrency(summary.totalPlatformFeesCents)}
          </p>
          <p className="text-sm text-stone-500 mt-1">Platform fees</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{summary.transferCount}</p>
          <p className="text-sm text-stone-500 mt-1">Transfers</p>
        </Card>
      </div>

      {transfers.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No transfers yet</p>
          <p className="text-stone-400 text-sm mt-1">
            {summary.onboardingComplete
              ? 'Transfers appear here once clients pay their event invoices'
              : 'Set up Stripe Connect to start receiving transfers'}
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell className="text-stone-500 text-sm">
                    {format(new Date(transfer.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {transfer.eventId ? (
                      <Link
                        href={`/events/${transfer.eventId}`}
                        className="text-brand-600 hover:underline capitalize"
                      >
                        {transfer.eventOccasion?.replace(/_/g, ' ') ?? 'Event'}
                      </Link>
                    ) : (
                      <span className="text-stone-400">
                        {transfer.isDeferred ? 'Deferred' : '-'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-stone-300 text-sm">
                    {formatCurrency(transfer.grossAmountCents)}
                  </TableCell>
                  <TableCell className="text-stone-500 text-sm">
                    {transfer.platformFeeCents > 0
                      ? `-${formatCurrency(transfer.platformFeeCents)}`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-green-700 font-semibold text-sm">
                    {formatCurrency(transfer.netTransferCents)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        transfer.status === 'paid'
                          ? 'success'
                          : transfer.status === 'reversed'
                            ? 'error'
                            : 'default'
                      }
                    >
                      {transfer.status}
                    </Badge>
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
