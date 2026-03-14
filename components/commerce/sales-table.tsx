'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Search } from 'lucide-react'
import Link from 'next/link'
import {
  SALE_STATUS_LABELS,
  SALE_STATUS_COLORS,
  SALE_CHANNEL_LABELS,
} from '@/lib/commerce/constants'
import type { SaleStatus, SaleChannel } from '@/lib/commerce/constants'

type Props = {
  sales: any[]
}

export function SalesTable({ sales }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let result = sales
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(
        (sale: any) =>
          (sale.sale_number && sale.sale_number.toLowerCase().includes(s)) ||
          sale.channel?.toLowerCase().includes(s)
      )
    }
    if (statusFilter) {
      result = result.filter((sale: any) => sale.status === statusFilter)
    }
    return result
  }, [sales, search, statusFilter])

  if (sales.length === 0) {
    return (
      <Card>
        <div className="p-8 text-center">
          <p className="text-stone-500">
            No sales yet. Complete your first checkout to see sales here.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <Input
            type="search"
            placeholder="Search by sale number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter ?? ''}
          onChange={(e) => setStatusFilter(e.target.value || null)}
          className="bg-stone-800 border border-stone-700 rounded-md px-3 text-stone-300 text-sm"
        >
          <option value="">All Statuses</option>
          {Object.entries(SALE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sale #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((sale: any) => (
              <TableRow key={sale.id}>
                <TableCell>
                  <Link
                    href={`/commerce/sales/${sale.id}`}
                    className="text-brand-500 hover:underline font-medium"
                  >
                    {sale.sale_number ?? 'Draft'}
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="text-stone-400">
                    {new Date(sale.created_at).toLocaleDateString()}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-stone-300">
                    {SALE_CHANNEL_LABELS[sale.channel as SaleChannel] ?? sale.channel}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={SALE_STATUS_COLORS[sale.status as SaleStatus] as any}>
                    {SALE_STATUS_LABELS[sale.status as SaleStatus] ?? sale.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-stone-200 font-medium">
                    ${((sale.total_cents ?? 0) / 100).toFixed(2)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
