'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getBankTransactions,
  confirmTransaction,
  ignoreTransaction,
  type BankTransaction,
  type BankConnection,
  type ReconciliationSummary,
} from '@/lib/finance/bank-feed-actions'
import { Landmark, Check, X, Filter } from 'lucide-react'

type Props = {
  connections: BankConnection[]
  initialTransactions: BankTransaction[]
  summary: ReconciliationSummary
}

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  pending: 'warning',
  confirmed: 'success',
  ignored: 'default',
}

function formatCents(cents: number): string {
  const abs = Math.abs(cents)
  const sign = cents < 0 ? '-' : ''
  return `${sign}$${(abs / 100).toFixed(2)}`
}

export function BankFeedPanel({ connections, initialTransactions, summary }: Props) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [filter, setFilter] = useState<string>('pending')
  const [isPending, startTransition] = useTransition()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [category, setCategory] = useState('')

  const filtered = filter ? transactions.filter((t) => t.status === filter) : transactions

  function handleConfirm(txId: string) {
    if (!category) return
    startTransition(async () => {
      const updated = await confirmTransaction(txId, category)
      setTransactions((prev) => prev.map((t) => (t.id === txId ? updated : t)))
      setConfirmingId(null)
      setCategory('')
    })
  }

  function handleIgnore(txId: string) {
    startTransition(async () => {
      await ignoreTransaction(txId)
      setTransactions((prev) =>
        prev.map((t) => (t.id === txId ? { ...t, status: 'ignored' as const } : t))
      )
    })
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Connections</p>
            <p className="text-2xl font-semibold text-stone-100">{connections.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Pending</p>
            <p className="text-2xl font-semibold text-amber-600">{summary.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Confirmed</p>
            <p className="text-2xl font-semibold text-emerald-600">{summary.confirmed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Pending Amount</p>
            <p className="text-2xl font-semibold text-stone-100">
              {formatCents(summary.totalPendingCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Filter className="h-4 w-4 text-stone-400 mt-2" />
        {['all', 'pending', 'confirmed', 'ignored'].map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === (f === 'all' ? '' : f) ? 'primary' : 'secondary'}
            onClick={() => setFilter(f === 'all' ? '' : f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-stone-400" />
            Bank Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="px-6 py-8 text-sm text-stone-500 text-center">No transactions found.</p>
          ) : (
            <div className="divide-y divide-stone-800">
              {filtered.map((tx) => (
                <div key={tx.id} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-stone-100 truncate">
                        {tx.vendorName || tx.description || 'Unknown'}
                      </p>
                      <Badge variant={STATUS_BADGE[tx.status] || 'default'}>{tx.status}</Badge>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {tx.date}
                      {tx.confirmedCategory && ` · ${tx.confirmedCategory}`}
                      {tx.suggestedCategory &&
                        !tx.confirmedCategory &&
                        ` · Suggested: ${tx.suggestedCategory}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p
                      className={`text-sm font-medium ${tx.amountCents < 0 ? 'text-red-600' : 'text-emerald-600'}`}
                    >
                      {formatCents(tx.amountCents)}
                    </p>
                    {tx.status === 'pending' && (
                      <div className="flex gap-1">
                        {confirmingId === tx.id ? (
                          <div className="flex items-center gap-1">
                            <select
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              className="rounded border border-stone-600 px-2 py-1 text-xs"
                            >
                              <option value="">Category…</option>
                              <option value="groceries">Groceries</option>
                              <option value="equipment">Equipment</option>
                              <option value="supplies">Supplies</option>
                              <option value="mileage">Mileage</option>
                              <option value="labor">Labor</option>
                              <option value="marketing">Marketing</option>
                              <option value="other">Other</option>
                            </select>
                            <Button
                              size="sm"
                              onClick={() => handleConfirm(tx.id)}
                              disabled={isPending || !category}
                            >
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirmingId(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmingId(tx.id)}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleIgnore(tx.id)}
                              disabled={isPending}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
