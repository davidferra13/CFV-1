'use client'

import { useState, useMemo } from 'react'
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
import type { TaxPrepReceiptEntry } from '@/lib/reports/tax-prep'

type SortField = 'date' | 'amount' | 'category'
type SortDir = 'asc' | 'desc'

export function ReceiptIndex({
  receipts,
  receiptsWithProof,
  receiptsWithoutProof,
}: {
  receipts: TaxPrepReceiptEntry[]
  receiptsWithProof: number
  receiptsWithoutProof: number
}) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const sorted = useMemo(() => {
    const copy = [...receipts]
    copy.sort((a, b) => {
      let cmp = 0
      if (sortField === 'date') {
        cmp = a.date.localeCompare(b.date)
      } else if (sortField === 'amount') {
        cmp = a.amountCents - b.amountCents
      } else {
        cmp = a.category.localeCompare(b.category)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [receipts, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir(field === 'amount' ? 'desc' : 'asc')
    }
  }

  function sortIndicator(field: SortField) {
    if (sortField !== field) return ''
    return sortDir === 'asc' ? ' \u2191' : ' \u2193'
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide">
            Receipt Index
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            {receipts.length} total expenses
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="text-green-400">
            {receiptsWithProof} with receipt
          </span>
          {receiptsWithoutProof > 0 && (
            <span className="text-amber-400">
              {receiptsWithoutProof} missing receipt
            </span>
          )}
        </div>
      </div>
      {receipts.length === 0 ? (
        <p className="text-sm text-stone-500">No expenses recorded</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    onClick={() => toggleSort('date')}
                    className="hover:text-stone-200 transition-colors"
                  >
                    Date{sortIndicator('date')}
                  </button>
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>
                  <button
                    onClick={() => toggleSort('category')}
                    className="hover:text-stone-200 transition-colors"
                  >
                    Category{sortIndicator('category')}
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => toggleSort('amount')}
                    className="hover:text-stone-200 transition-colors"
                  >
                    Amount{sortIndicator('amount')}
                  </button>
                </TableHead>
                <TableHead className="text-center">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r, i) => (
                <TableRow key={`${r.date}-${i}`}>
                  <TableCell className="text-sm text-stone-400 whitespace-nowrap">
                    {r.date}
                  </TableCell>
                  <TableCell className="text-sm text-stone-300 max-w-[200px] truncate">
                    {r.description || '(no description)'}
                  </TableCell>
                  <TableCell className="text-sm text-stone-400">
                    {r.vendor || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-stone-400 capitalize">
                    {r.category}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-stone-200">
                    {formatCurrency(r.amountCents)}
                  </TableCell>
                  <TableCell className="text-center">
                    {r.hasReceipt ? (
                      <span className="text-green-400 text-xs">Yes</span>
                    ) : (
                      <span className="text-stone-600 text-xs">No</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  )
}
