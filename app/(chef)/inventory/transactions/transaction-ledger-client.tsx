'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getTransactionHistory } from '@/lib/inventory/transaction-actions'

const TRANSACTION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'receive', label: 'Receive' },
  { value: 'event_deduction', label: 'Event Deduction' },
  { value: 'waste', label: 'Waste' },
  { value: 'staff_meal', label: 'Staff Meal' },
  { value: 'transfer_out', label: 'Transfer Out' },
  { value: 'transfer_in', label: 'Transfer In' },
  { value: 'audit_adjustment', label: 'Audit Adjustment' },
  { value: 'return_from_event', label: 'Return from Event' },
  { value: 'return_to_vendor', label: 'Return to Vendor' },
  { value: 'manual_adjustment', label: 'Manual Adjustment' },
  { value: 'opening_balance', label: 'Opening Balance' },
]

const TYPE_COLORS: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  receive: 'success',
  transfer_in: 'success',
  return_from_event: 'success',
  opening_balance: 'info',
  event_deduction: 'error',
  waste: 'error',
  staff_meal: 'warning',
  transfer_out: 'warning',
  return_to_vendor: 'warning',
  audit_adjustment: 'info',
  manual_adjustment: 'info',
}

function formatType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatQty(qty: number) {
  const sign = qty > 0 ? '+' : ''
  return `${sign}${Number(qty).toFixed(2)}`
}

function formatCost(cents: number | null) {
  if (cents == null) return '—'
  return `$${(cents / 100).toFixed(2)}`
}

type Props = {
  initialTransactions: any[]
  initialTotal: number
}

export function TransactionLedgerClient({ initialTransactions, initialTotal }: Props) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [total, setTotal] = useState(initialTotal)
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  function applyFilters(type: string, searchTerm: string) {
    startTransition(async () => {
      try {
        const result = await getTransactionHistory({
          transactionType: (type || undefined) as any,
          ingredientId: (searchTerm || undefined) as any,
        } as any)
        const data = result as { transactions: any[]; total: number }
        setTransactions(data.transactions)
        setTotal(data.total)
      } catch {
        // keep current data on error
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              applyFilters(e.target.value, search)
            }}
            className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200"
          >
            {TRANSACTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search ingredient..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              applyFilters(typeFilter, e.target.value)
            }}
            className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200 flex-1 min-w-[200px]"
          />
          <span className="text-sm text-stone-500 self-center">
            {total} transaction{total !== 1 ? 's' : ''}
          </span>
        </div>
      </Card>

      {/* Transaction table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700 text-stone-400">
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Ingredient</th>
                <th className="text-right px-4 py-3 font-medium">Qty</th>
                <th className="text-left px-4 py-3 font-medium">Unit</th>
                <th className="text-right px-4 py-3 font-medium">Cost</th>
                <th className="text-left px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                    {isPending
                      ? 'Loading...'
                      : 'No transactions found. Record your first inventory movement to get started.'}
                  </td>
                </tr>
              ) : (
                transactions.map((tx: any) => (
                  <tr key={tx.id} className="border-b border-stone-800 hover:bg-stone-800/50">
                    <td className="px-4 py-3 text-stone-300 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={TYPE_COLORS[tx.transactionType] ?? 'default'}>
                        {formatType(tx.transactionType)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-stone-100 font-medium">{tx.ingredientName}</td>
                    <td
                      className={`px-4 py-3 text-right font-mono ${tx.quantity > 0 ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {formatQty(tx.quantity)}
                    </td>
                    <td className="px-4 py-3 text-stone-400">{tx.unit}</td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {formatCost(tx.costCents)}
                    </td>
                    <td className="px-4 py-3 text-stone-500 max-w-[200px] truncate">
                      {tx.notes || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
