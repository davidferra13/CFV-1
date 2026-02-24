'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'default',
  submitted: 'info',
  partially_received: 'warning',
  received: 'success',
  cancelled: 'error',
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatCents(cents: number | null) {
  if (cents == null) return '—'
  return `$${(cents / 100).toFixed(2)}`
}

type Props = {
  initialOrders: any[]
}

export function POListClient({ initialOrders }: Props) {
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = statusFilter
    ? initialOrders.filter((o) => o.status === statusFilter)
    : initialOrders

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['', 'draft', 'submitted', 'partially_received', 'received', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              statusFilter === s
                ? 'bg-brand-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            {s ? formatStatus(s) : 'All'}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700 text-stone-400">
                <th className="text-left px-4 py-3 font-medium">PO #</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Order Date</th>
                <th className="text-right px-4 py-3 font-medium">Estimated</th>
                <th className="text-right px-4 py-3 font-medium">Actual</th>
                <th className="text-left px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                    No purchase orders found. Create your first PO to start tracking purchases.
                  </td>
                </tr>
              ) : (
                filtered.map((po: any) => (
                  <tr key={po.id} className="border-b border-stone-800 hover:bg-stone-800/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/inventory/purchase-orders/${po.id}`}
                        className="text-brand-500 hover:underline font-medium"
                      >
                        {po.poNumber || po.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[po.status] ?? 'default'}>
                        {formatStatus(po.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-stone-300">
                      {po.orderDate ? new Date(po.orderDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {formatCents(po.estimatedTotalCents)}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {formatCents(po.actualTotalCents)}
                    </td>
                    <td className="px-4 py-3 text-stone-500 max-w-[200px] truncate">
                      {po.notes || '—'}
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
