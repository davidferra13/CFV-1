import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getLedgerEntries } from '@/lib/ledger/actions'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Payments' }

const VIEWS = [
  {
    href: '/finance/payments/deposits',
    label: 'Deposits',
    icon: '⬇️',
    description: 'Deposit payments received',
    entryType: 'deposit',
  },
  {
    href: '/finance/payments/installments',
    label: 'Installments',
    icon: '📆',
    description: 'Installment and partial payments',
    entryType: 'installment',
  },
  {
    href: '/finance/payments/refunds',
    label: 'Refunds',
    icon: '↩️',
    description: 'Payments refunded to clients',
    entryType: 'refund',
  },
  {
    href: '/finance/payments/failed',
    label: 'Failed / Pending',
    icon: '⚠️',
    description: 'Accepted events awaiting payment',
    entryType: null,
  },
]

export default async function PaymentsPage() {
  await requireChef()

  const [allPayments, deposits, installments, refunds] = await Promise.all([
    getLedgerEntries({ entryType: 'payment' }),
    getLedgerEntries({ entryType: 'deposit' }),
    getLedgerEntries({ entryType: 'installment' }),
    getLedgerEntries({ entryType: 'refund' }),
  ])

  const allInbound = [...allPayments, ...deposits, ...installments]
  const totalReceived = allInbound.reduce((s, e) => s + e.amount_cents, 0)
  const totalRefunded = refunds.reduce((s: any, e: any) => s + e.amount_cents, 0)

  const counts = {
    deposit: deposits.length,
    installment: installments.length,
    refund: refunds.length,
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
          ← Finance
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Payments</h1>
        <p className="text-stone-500 mt-1">
          All payment activity - inbound receipts and outbound refunds
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalReceived)}</p>
          <p className="text-sm text-stone-500 mt-1">
            Total received ({allInbound.length} entries)
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalRefunded)}</p>
          <p className="text-sm text-stone-500 mt-1">Total refunded ({refunds.length})</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">
            {formatCurrency(totalReceived - totalRefunded)}
          </p>
          <p className="text-sm text-stone-500 mt-1">Net received</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {VIEWS.map((view) => (
          <Link key={view.href} href={view.href}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{view.icon}</span>
                  <h2 className="font-semibold text-stone-100">{view.label}</h2>
                </div>
                {view.entryType && (
                  <span className="text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded-full">
                    {counts[view.entryType as keyof typeof counts] ?? 0}
                  </span>
                )}
              </div>
              <p className="text-sm text-stone-500">{view.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
