import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRetainersByTenant } from '@/lib/retainers/actions'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RetainerStatusBadge } from '@/components/retainers/retainer-status-badge'
import { formatCurrency } from '@/lib/utils/currency'
import { BILLING_CYCLE_LABELS } from '@/lib/retainers/constants'

export const metadata: Metadata = { title: 'Retainers' }

export default async function RetainersPage() {
  await requireChef()
  let retainers: Awaited<ReturnType<typeof getRetainersByTenant>> = []
  try {
    retainers = await getRetainersByTenant()
  } catch {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Retainers</h1>
            <p className="text-stone-500 mt-1">Recurring service agreements with clients</p>
          </div>
        </div>
        <Card className="p-8 text-center">
          <p className="text-stone-400 font-medium mb-1">Could not load retainers</p>
          <p className="text-stone-500 text-sm">Check your connection and refresh.</p>
        </Card>
      </div>
    )
  }

  // Summary stats
  const activeRetainers = retainers.filter((r: any) => r.status === 'active')
  const totalMrrCents = activeRetainers.reduce(
    (sum: number, r: any) => sum + (r.amount_cents || 0),
    0
  )

  // Count overdue periods across all retainers - would require a separate query,
  // but we can approximate from the retainer list view by noting which have billing issues.
  // For now, we surface the count of active retainers and MRR.

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Retainers</h1>
          <p className="text-stone-500 mt-1">Recurring service agreements with clients</p>
        </div>
        <Link href="/finance/retainers/new">
          <Button variant="primary">New Retainer</Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{activeRetainers.length}</p>
          <p className="text-sm text-stone-500 mt-1">Active retainers</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalMrrCents)}</p>
          <p className="text-sm text-stone-500 mt-1">Monthly recurring revenue</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{retainers.length}</p>
          <p className="text-sm text-stone-500 mt-1">Total retainers</p>
        </Card>
      </div>

      {/* Retainers Table */}
      {retainers.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-stone-500 mb-4">
            No retainers yet. Create your first retainer agreement to start billing recurring
            clients.
          </p>
          <Link href="/finance/retainers/new">
            <Button variant="primary">Create Retainer</Button>
          </Link>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-800 bg-stone-800/60">
                  <th className="text-left py-3 px-4 font-medium text-stone-400">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-stone-400">Client</th>
                  <th className="text-left py-3 px-4 font-medium text-stone-400">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-stone-400">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-stone-400">Cycle</th>
                  <th className="text-left py-3 px-4 font-medium text-stone-400">Next Billing</th>
                  <th className="text-right py-3 px-4 font-medium text-stone-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {retainers.map((retainer: any) => (
                  <tr
                    key={retainer.id}
                    className="border-b border-stone-50 hover:bg-stone-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/finance/retainers/${retainer.id}`}
                        className="font-medium text-stone-100 hover:text-brand-600"
                      >
                        {retainer.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-stone-400">
                      {retainer.clients?.full_name || 'Unknown'}
                    </td>
                    <td className="py-3 px-4">
                      <RetainerStatusBadge status={retainer.status} />
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-stone-100">
                      {formatCurrency(retainer.amount_cents)}
                    </td>
                    <td className="py-3 px-4 text-stone-400">
                      {BILLING_CYCLE_LABELS[retainer.billing_cycle] || retainer.billing_cycle}
                    </td>
                    <td className="py-3 px-4 text-stone-400">
                      {retainer.next_billing_date
                        ? new Date(retainer.next_billing_date + 'T00:00:00').toLocaleDateString(
                            'en-US',
                            { month: 'short', day: 'numeric', year: 'numeric' }
                          )
                        : '\u2014'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/finance/retainers/${retainer.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
