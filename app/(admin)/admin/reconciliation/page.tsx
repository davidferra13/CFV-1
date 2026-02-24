import type { Metadata } from 'next'
import { getPlatformReconciliation } from '@/lib/admin/reconciliation-actions'
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

export const metadata: Metadata = { title: 'Platform Reconciliation - Admin' }

export default async function ReconciliationPage() {
  const data = await getPlatformReconciliation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Platform Reconciliation</h1>
        <p className="text-stone-500 mt-1">
          Cross-tenant GMV, transfers, platform fees, and deferred amounts
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{formatCurrency(data.totalGmvCents)}</p>
          <p className="text-sm text-stone-500 mt-1">Total GMV</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">
            {formatCurrency(data.totalTransferredCents)}
          </p>
          <p className="text-sm text-stone-500 mt-1">Transferred to chefs</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-violet-700">
            {formatCurrency(data.totalPlatformFeesCents)}
          </p>
          <p className="text-sm text-stone-500 mt-1">Platform fees</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-amber-600">
            {formatCurrency(data.totalDeferredCents)}
          </p>
          <p className="text-sm text-stone-500 mt-1">Deferred</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(data.totalRefundedCents)}
          </p>
          <p className="text-sm text-stone-500 mt-1">Refunded</p>
        </Card>
      </div>

      {data.chefs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No financial activity</p>
          <p className="text-stone-400 text-sm mt-1">
            Chef transactions will appear here once payments are processed
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chef</TableHead>
                <TableHead>GMV</TableHead>
                <TableHead>Transferred</TableHead>
                <TableHead>Fees</TableHead>
                <TableHead>Deferred</TableHead>
                <TableHead>Refunded</TableHead>
                <TableHead>Connect</TableHead>
                <TableHead>Transfers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.chefs.map((chef) => (
                <TableRow key={chef.tenantId}>
                  <TableCell className="font-medium text-stone-100">{chef.chefName}</TableCell>
                  <TableCell className="text-stone-300 text-sm">
                    {formatCurrency(chef.gmvCents)}
                  </TableCell>
                  <TableCell className="text-green-700 text-sm">
                    {formatCurrency(chef.transferredCents)}
                  </TableCell>
                  <TableCell className="text-violet-700 text-sm">
                    {formatCurrency(chef.platformFeesCents)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {chef.deferredCents > 0 ? (
                      <span className="text-amber-600 font-medium">
                        {formatCurrency(chef.deferredCents)}
                      </span>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {chef.refundedCents > 0 ? (
                      <span className="text-red-600">{formatCurrency(chef.refundedCents)}</span>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={chef.onboardingComplete ? 'success' : 'warning'}>
                      {chef.onboardingComplete ? 'Active' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">{chef.transferCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
