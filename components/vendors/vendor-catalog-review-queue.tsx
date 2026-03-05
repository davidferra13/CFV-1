'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  approveAllPendingVendorCatalogRows,
  reviewVendorCatalogRow,
  type VendorCatalogQueueRow,
} from '@/lib/vendors/catalog-import-actions'

interface VendorCatalogReviewQueueProps {
  vendorId: string
  rows: VendorCatalogQueueRow[]
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatSize(row: VendorCatalogQueueRow): string {
  if (row.unit_size == null && !row.unit_measure) return '-'
  if (row.unit_size == null) return row.unit_measure || '-'
  if (!row.unit_measure) return String(row.unit_size)
  return `${row.unit_size} ${row.unit_measure}`
}

function confidenceVariant(confidence: VendorCatalogQueueRow['confidence']) {
  if (confidence === 'high') return 'success'
  if (confidence === 'medium') return 'warning'
  return 'error'
}

function formatFlag(flag: string): string {
  return flag.replace(/_/g, ' ')
}

export function VendorCatalogReviewQueue({
  vendorId,
  rows: initialRows,
}: VendorCatalogReviewQueueProps) {
  const router = useRouter()

  const [rows, setRows] = useState(initialRows)
  const [loadingRowId, setLoadingRowId] = useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [bulkErrors, setBulkErrors] = useState<string[]>([])

  const counts = useMemo(
    () => ({
      total: rows.length,
      high: rows.filter((row) => row.confidence === 'high').length,
      medium: rows.filter((row) => row.confidence === 'medium').length,
      low: rows.filter((row) => row.confidence === 'low').length,
    }),
    [rows]
  )

  const handleRowAction = async (rowId: string, action: 'approve' | 'reject') => {
    setError(null)
    setMessage(null)
    setBulkErrors([])
    setLoadingRowId(rowId)

    try {
      await reviewVendorCatalogRow({ row_id: rowId, action })
      setRows((prev) => prev.filter((row) => row.id !== rowId))
      setMessage(action === 'approve' ? 'Row approved.' : 'Row rejected.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to review row')
    } finally {
      setLoadingRowId(null)
    }
  }

  const handleApproveAll = async () => {
    if (rows.length === 0) return

    setError(null)
    setMessage(null)
    setBulkErrors([])
    setBulkLoading(true)

    try {
      const result = await approveAllPendingVendorCatalogRows(vendorId)
      setRows([])

      if (result.failedCount > 0) {
        setMessage(`Approved ${result.appliedCount} row(s), ${result.failedCount} failed.`)
        setBulkErrors(result.errors.slice(0, 8))
      } else {
        setMessage(`Approved ${result.appliedCount} row(s).`)
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve all rows')
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Catalog Review Queue</CardTitle>
          <p className="mt-1 text-sm text-stone-500">
            Pending rows: {counts.total} (high: {counts.high}, medium: {counts.medium}, low:{' '}
            {counts.low})
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleApproveAll}
          loading={bulkLoading}
          disabled={rows.length === 0 || loadingRowId !== null}
        >
          Approve All Pending
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-lg border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {bulkErrors.length > 0 && (
          <div className="rounded-lg border border-amber-800 bg-amber-950 px-3 py-2 text-xs text-amber-300">
            <p className="font-medium">{bulkErrors.length} row(s) could not be applied:</p>
            <ul className="mt-1 list-disc pl-4">
              {bulkErrors.map((entry, index) => (
                <li key={`${entry}-${index}`}>{entry}</li>
              ))}
            </ul>
          </div>
        )}

        {rows.length === 0 ? (
          <p className="text-sm text-stone-500">No catalog rows waiting review.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-stone-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 bg-stone-800 text-left text-stone-400">
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Size</th>
                  <th className="px-3 py-2">Confidence</th>
                  <th className="px-3 py-2">Flags</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const rowLoading = loadingRowId === row.id
                  return (
                    <tr key={row.id} className="border-b border-stone-800 align-top">
                      <td className="px-3 py-2 text-stone-400">{row.source_row_number}</td>
                      <td className="px-3 py-2 text-stone-200">
                        <p>{row.vendor_item_name}</p>
                        {row.notes && <p className="mt-1 text-xs text-stone-500">{row.notes}</p>}
                      </td>
                      <td className="px-3 py-2 text-stone-400">{row.vendor_sku || '-'}</td>
                      <td className="px-3 py-2 text-stone-200">
                        {formatCurrency(row.unit_price_cents)}
                      </td>
                      <td className="px-3 py-2 text-stone-400">{formatSize(row)}</td>
                      <td className="px-3 py-2">
                        <Badge variant={confidenceVariant(row.confidence)}>{row.confidence}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-stone-500">
                        {row.parse_flags.length === 0 ? (
                          '-'
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {row.parse_flags.slice(0, 3).map((flag) => (
                              <Badge key={flag} variant="default">
                                {formatFlag(flag)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleRowAction(row.id, 'approve')}
                            loading={rowLoading}
                            disabled={loadingRowId !== null || bulkLoading}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRowAction(row.id, 'reject')}
                            disabled={loadingRowId !== null || bulkLoading}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
